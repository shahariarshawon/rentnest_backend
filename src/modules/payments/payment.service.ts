import { PaymentProvider, PaymentStatus, PropertyStatus, RentalStatus, Role } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { stripe } from "../../config/stripe.js";
import { AppError } from "../../common/errors/AppError.js";
import { formatPaginatedResponse, getPaginationParams } from "../../common/utils/pagination.js";
import type { Request } from "express";

export async function createPaymentSession(tenantId: string, rentalRequestId: string) {
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

  if (rental.payment && rental.payment.status === PaymentStatus.COMPLETED) {
    throw new AppError("Payment has already been completed for this rental request", 400);
  }

  const amountNumber = Number(rental.totalAmount);
  let checkoutUrl: string | null = null;
  let stripeSessionId: string | null = null;

  if (stripe && env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes("xxxxxxxxx")) {
    try {
      const session = await stripe.checkout.sessions.create({
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
        success_url: `${env.APP_URL}/api/payments/confirm?session_id={CHECKOUT_SESSION_ID}&rentalRequestId=${rentalRequestId}`,
        cancel_url: `${env.APP_URL}/api/rentals/${rentalRequestId}`,
        client_reference_id: rentalRequestId
      });

      checkoutUrl = session.url;
      stripeSessionId = session.id;
    } catch (err: unknown) {
      console.warn("Stripe Checkout creation error, falling back to simulated session:", err);
      stripeSessionId = `cs_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      checkoutUrl = `${env.APP_URL}/api/payments/confirm?session_id=${stripeSessionId}&rentalRequestId=${rentalRequestId}`;
    }
  } else {
    stripeSessionId = `cs_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    checkoutUrl = `${env.APP_URL}/api/payments/confirm?session_id=${stripeSessionId}&rentalRequestId=${rentalRequestId}`;
  }

  const payment = await prisma.payment.upsert({
    where: { rentalRequestId },
    update: {
      amount: rental.totalAmount,
      stripeSessionId,
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE
    },
    create: {
      rentalRequestId,
      amount: rental.totalAmount,
      stripeSessionId,
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE
    }
  });

  return {
    payment,
    checkoutUrl,
    stripeSessionId
  };
}

export async function confirmPayment(
  userId: string,
  userRole: string,
  data: { rentalRequestId: string; stripeSessionId?: string; transactionId?: string }
) {
  const rental = await prisma.rentalRequest.findUnique({
    where: { id: data.rentalRequestId },
    include: {
      payment: true,
      property: true
    }
  });

  if (!rental) {
    throw new AppError("Rental request not found", 404);
  }

  if (userRole !== Role.ADMIN && rental.tenantId !== userId) {
    throw new AppError("You do not have permission to confirm payment for this rental request", 403);
  }

  if (rental.status === RentalStatus.ACTIVE && rental.payment?.status === PaymentStatus.COMPLETED) {
    return {
      payment: rental.payment,
      rentalRequest: rental,
      message: "Payment is already confirmed and active"
    };
  }

  if (rental.status !== RentalStatus.APPROVED && rental.status !== RentalStatus.ACTIVE) {
    throw new AppError("Rental request must be in APPROVED state to confirm payment", 400);
  }

  const transactionId =
    data.transactionId ||
    `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const updatedPayment = await prisma.payment.upsert({
    where: { rentalRequestId: data.rentalRequestId },
    update: {
      status: PaymentStatus.COMPLETED,
      paidAt: new Date(),
      transactionId,
      stripeSessionId: data.stripeSessionId || rental.payment?.stripeSessionId
    },
    create: {
      rentalRequestId: data.rentalRequestId,
      amount: rental.totalAmount,
      status: PaymentStatus.COMPLETED,
      paidAt: new Date(),
      transactionId,
      stripeSessionId: data.stripeSessionId,
      provider: PaymentProvider.STRIPE
    }
  });

  const updatedRental = await prisma.rentalRequest.update({
    where: { id: data.rentalRequestId },
    data: { status: RentalStatus.ACTIVE }
  });

  await prisma.property.update({
    where: { id: rental.propertyId },
    data: { status: PropertyStatus.UNAVAILABLE }
  });

  return {
    payment: updatedPayment,
    rentalRequest: updatedRental,
    message: "Payment confirmed successfully and rental is now ACTIVE"
  };
}

export async function getUserPayments(userId: string, userRole: string, req: Request) {
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

export async function getPaymentById(userId: string, userRole: string, id: string) {
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
