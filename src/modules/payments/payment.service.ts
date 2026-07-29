import type Stripe from "stripe";
import {
  PaymentProvider,
  PaymentStatus,
  PropertyStatus,
  RentalStatus,
  Role
} from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { stripe } from "../../config/stripe.js";
import { AppError } from "../../common/errors/AppError.js";
import {
  formatPaginatedResponse,
  getPaginationParams
} from "../../common/utils/pagination.js";
import type { Request } from "express";

function requireStripe() {
  if (!stripe || !env.STRIPE_SECRET_KEY) {
    throw new AppError(
      "Stripe is not configured. Add a valid STRIPE_SECRET_KEY to the deployment environment.",
      503
    );
  }

  return stripe;
}

function getTransactionId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  if (session.payment_intent && typeof session.payment_intent === "object") {
    return session.payment_intent.id;
  }

  return session.id;
}

async function finalizeStripeCheckout(session: Stripe.Checkout.Session) {
  const rentalRequestId =
    session.client_reference_id ?? session.metadata?.rentalRequestId;

  if (!rentalRequestId) {
    throw new AppError("Stripe session is missing the rental request reference", 400);
  }

  if (session.payment_status !== "paid") {
    throw new AppError("Stripe has not marked this Checkout session as paid", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const rental = await tx.rentalRequest.findUnique({
      where: { id: rentalRequestId },
      include: { payment: true }
    });

    if (!rental) {
      throw new AppError("Rental request not found", 404);
    }

    if (
      rental.status === RentalStatus.ACTIVE &&
      rental.payment?.status === PaymentStatus.COMPLETED
    ) {
      return {
        payment: rental.payment,
        rentalRequest: rental,
        message: "Payment is already confirmed and active"
      };
    }

    if (rental.status !== RentalStatus.APPROVED) {
      throw new AppError(
        "Rental request must be APPROVED before payment can be finalized",
        400
      );
    }

    const expectedAmount = Math.round(Number(rental.totalAmount) * 100);

    if (session.amount_total !== expectedAmount) {
      throw new AppError("Stripe payment amount does not match the rental amount", 400);
    }

    if ((session.currency ?? "").toLowerCase() !== "usd") {
      throw new AppError("Stripe payment currency does not match the rental currency", 400);
    }

    const transactionId = getTransactionId(session);
    const paidAt = new Date();

    const payment = await tx.payment.upsert({
      where: { rentalRequestId },
      update: {
        amount: rental.totalAmount,
        currency: "usd",
        method: "card",
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.COMPLETED,
        paidAt,
        transactionId,
        stripeSessionId: session.id
      },
      create: {
        rentalRequestId,
        amount: rental.totalAmount,
        currency: "usd",
        method: "card",
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.COMPLETED,
        paidAt,
        transactionId,
        stripeSessionId: session.id
      }
    });

    const rentalRequest = await tx.rentalRequest.update({
      where: { id: rentalRequestId },
      data: { status: RentalStatus.ACTIVE }
    });

    await tx.property.update({
      where: { id: rental.propertyId },
      data: { status: PropertyStatus.UNAVAILABLE }
    });

    return {
      payment,
      rentalRequest,
      message: "Stripe payment verified and rental is now ACTIVE"
    };
  });

  return result;
}

export async function createPaymentSession(
  tenantId: string,
  rentalRequestId: string
) {
  const stripeClient = requireStripe();

  const rental = await prisma.rentalRequest.findUnique({
    where: { id: rentalRequestId },
    include: {
      property: true,
      payment: true
    }
  });

  if (!rental) {
    throw new AppError("Rental request not found", 404);
  }

  if (rental.tenantId !== tenantId) {
    throw new AppError("You do not have permission to pay for this rental request", 403);
  }

  if (rental.status !== RentalStatus.APPROVED) {
    throw new AppError("Payment can only be initiated for APPROVED rental requests", 400);
  }

  if (rental.payment?.status === PaymentStatus.COMPLETED) {
    throw new AppError("Payment has already been completed for this rental request", 400);
  }

  const amountNumber = Number(rental.totalAmount);

  let session: Stripe.Checkout.Session;

  try {
    session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Rental: ${rental.property.title}`,
              description: `${rental.durationMonths} month(s) rental for ${rental.property.address}, ${rental.property.city}`
            },
            unit_amount: Math.round(amountNumber * 100)
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${env.APP_URL}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL}/api/properties/${rental.propertyId}`,
      client_reference_id: rentalRequestId,
      metadata: {
        rentalRequestId,
        tenantId
      }
    });
  } catch (error) {
    console.error("Stripe Checkout session creation failed", error);
    throw new AppError("Unable to create Stripe Checkout session", 502);
  }

  const payment = await prisma.payment.upsert({
    where: { rentalRequestId },
    update: {
      amount: rental.totalAmount,
      currency: "usd",
      method: "card",
      stripeSessionId: session.id,
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE
    },
    create: {
      rentalRequestId,
      amount: rental.totalAmount,
      currency: "usd",
      method: "card",
      stripeSessionId: session.id,
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE
    }
  });

  return {
    payment,
    checkoutUrl: session.url,
    stripeSessionId: session.id
  };
}

export async function confirmPayment(
  userId: string,
  userRole: string,
  data: { rentalRequestId: string; stripeSessionId: string }
) {
  const stripeClient = requireStripe();

  const rental = await prisma.rentalRequest.findUnique({
    where: { id: data.rentalRequestId },
    select: { tenantId: true }
  });

  if (!rental) {
    throw new AppError("Rental request not found", 404);
  }

  if (userRole !== Role.ADMIN && rental.tenantId !== userId) {
    throw new AppError("You do not have permission to confirm this payment", 403);
  }

  let session: Stripe.Checkout.Session;

  try {
    session = await stripeClient.checkout.sessions.retrieve(data.stripeSessionId);
  } catch (error) {
    console.error("Stripe Checkout session retrieval failed", error);
    throw new AppError("Unable to verify Stripe Checkout session", 502);
  }

  const referencedRentalId =
    session.client_reference_id ?? session.metadata?.rentalRequestId;

  if (referencedRentalId !== data.rentalRequestId) {
    throw new AppError("Stripe session does not belong to this rental request", 400);
  }

  return finalizeStripeCheckout(session);
}

export async function processStripeWebhook(
  rawBody: Buffer,
  signature: string
) {
  const stripeClient = requireStripe();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(
      "Stripe webhook is not configured. Add STRIPE_WEBHOOK_SECRET.",
      503
    );
  }

  let event: Stripe.Event;

  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    throw new AppError("Invalid Stripe webhook signature", 400);
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const result = await finalizeStripeCheckout(checkoutSession);

    return {
      received: true,
      processed: true,
      eventType: event.type,
      result
    };
  }

  return {
    received: true,
    processed: false,
    eventType: event.type
  };
}

export async function getUserPayments(
  userId: string,
  userRole: string,
  req: Request
) {
  const pagination = getPaginationParams(req);

  let where: Record<string, unknown> = {};

  if (userRole === Role.TENANT) {
    where = { rentalRequest: { tenantId: userId } };
  } else if (userRole === Role.LANDLORD) {
    where = { rentalRequest: { landlordId: userId } };
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        rentalRequest: {
          include: {
            property: {
              select: { id: true, title: true, address: true, city: true }
            },
            tenant: {
              select: { id: true, name: true, email: true }
            },
            landlord: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    }),
    prisma.payment.count({ where })
  ]);

  return formatPaginatedResponse(payments, total, pagination);
}

export async function getPaymentById(
  userId: string,
  userRole: string,
  id: string
) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      rentalRequest: {
        include: {
          property: true,
          tenant: { select: { id: true, name: true, email: true } },
          landlord: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });

  if (!payment) {
    throw new AppError("Payment record not found", 404);
  }

  if (
    userRole !== Role.ADMIN &&
    payment.rentalRequest.tenantId !== userId &&
    payment.rentalRequest.landlordId !== userId
  ) {
    throw new AppError("You do not have permission to view this payment record", 403);
  }

  return payment;
}
