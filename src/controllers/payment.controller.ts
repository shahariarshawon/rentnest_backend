import type { RequestHandler } from "express";
import { randomBytes } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";

import {
  initiateSSLPayment,
  validateSSLPayment,
  querySSLTransaction,
} from "../services/sslcommerz.service.js";

import type {
  CreatePaymentInput,
  PaymentQueryInput,
} from "../validations/payment.validation.js";

import { paymentCallbackSchema } from "../validations/payment.validation.js";

// ==========================================
// REUSABLE HELPER: VERIFY & COMPLETE PAYMENT
// ==========================================

export async function verifyAndCompletePayment(
  paymentId: string,
  providedValId?: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      rentalRequest: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError("Payment transaction not found", 404);
  }

  // Idempotency: duplicate confirmations return the completed payment
  if (payment.status === "COMPLETED") {
    return payment;
  }

  let validationId = providedValId;

  // If val_id not provided, retrieve it from SSLCommerz via query API
  if (!validationId && payment.transactionId) {
    const queryResult = await querySSLTransaction(payment.transactionId);

    if (queryResult.APIConnect !== "DONE") {
      throw new AppError("Unable to verify transaction with SSLCommerz", 502);
    }

    const gatewayTransaction =
      queryResult.element?.find(
        (item) =>
          item.tran_id === payment.transactionId &&
          (item.status === "VALID" || item.status === "VALIDATED"),
      ) ??
      queryResult.element?.find(
        (item) => item.tran_id === payment.transactionId,
      );

    if (!gatewayTransaction) {
      throw new AppError("Transaction not found at payment gateway", 404);
    }

    if (
      gatewayTransaction.status === "FAILED" ||
      gatewayTransaction.status === "CANCELLED"
    ) {
      const newStatus =
        gatewayTransaction.status === "CANCELLED" ? "CANCELLED" : "FAILED";
      await prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: newStatus },
      });
      throw new AppError(
        `Payment was marked as ${newStatus.toLowerCase()} by payment gateway`,
        400,
      );
    }

    if (gatewayTransaction.status === "PENDING") {
      throw new AppError("Payment is still pending at payment gateway", 400);
    }

    validationId = gatewayTransaction.val_id;
  }

  if (!validationId) {
    throw new AppError("Payment validation ID is missing or unresolved", 400);
  }

  // Fresh server-to-server validation
  const validation = await validateSSLPayment(validationId);

  if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
    throw new AppError("SSLCommerz could not validate this payment", 400);
  }

  // Verify the transaction reference
  if (validation.tran_id !== payment.transactionId) {
    throw new AppError("Transaction ID mismatch", 400);
  }

  // Verify amount using Decimal arithmetic
  const verifiedAmount = new Prisma.Decimal(validation.amount ?? "0");
  if (!verifiedAmount.equals(payment.amount)) {
    throw new AppError("Payment amount mismatch", 400);
  }

  // Verify currency
  const gatewayCurrency = validation.currency_type ?? validation.currency;
  if (validation.currency !== "BDT" || gatewayCurrency !== "BDT") {
    throw new AppError("Payment currency mismatch", 400);
  }

  // Risky transactions must not activate rentals
  if (Number(validation.risk_level ?? 0) === 1) {
    throw new AppError("Payment held for manual risk verification", 400);
  }

  // Atomically complete payment and activate rental
  const completedPayment = await prisma.$transaction(
    async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          rentalRequest: {
            include: { property: true },
          },
        },
      });

      if (!currentPayment) {
        throw new AppError("Payment record not found", 404);
      }

      if (currentPayment.status === "COMPLETED") {
        return currentPayment;
      }

      if (currentPayment.status !== "PENDING") {
        throw new AppError("Payment is no longer pending", 409);
      }

      if (currentPayment.rentalRequest.status !== "APPROVED") {
        throw new AppError("Rental request is not approved", 409);
      }

      if (currentPayment.rentalRequest.property.status === "RENTED") {
        throw new AppError("This property has already been rented", 409);
      }

      const rentalRequestId = currentPayment.rentalRequestId;
      const propertyId = currentPayment.rentalRequest.propertyId;

      // Update payment record
      const updatedPayment = await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          status: "COMPLETED",
          paidAt: validation.tran_date
            ? new Date(validation.tran_date)
            : new Date(),
          gatewayValidationId: validation.val_id,
          bankTransactionId: validation.bank_tran_id || null,
          method: validation.card_type ?? null,
        },
      });

      // Activate rental request
      await tx.rentalRequest.update({
        where: { id: rentalRequestId },
        data: { status: "ACTIVE" },
      });

      // Mark property as rented
      await tx.property.update({
        where: { id: propertyId },
        data: { status: "RENTED" },
      });

      // Cancel other pending requests for this property
      await tx.rentalRequest.updateMany({
        where: {
          propertyId,
          id: { not: rentalRequestId },
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
          landlordResponse:
            "This property has been rented by another tenant.",
          decidedAt: new Date(),
        },
      });

      return updatedPayment;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  return completedPayment;
}

// ===========================
// 1. CREATE PAYMENT SESSION
// ===========================

export const createPayment: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const tenantId = req.user.id;
    const data = req.body as CreatePaymentInput;

    const apiBaseUrl = process.env.API_BASE_URL;
    if (!apiBaseUrl) {
      throw new AppError("API_BASE_URL is not configured", 500);
    }

    const callbackUrl = `${apiBaseUrl.replace(/\/+$/, "")}/api/payments/confirm`;

    // Step 1: Check rental request and existing payment records
    const setup = await prisma.$transaction(
      async (tx) => {
        const rentalRequest = await tx.rentalRequest.findUnique({
          where: { id: data.rentalRequestId },
          include: {
            tenant: true,
            property: true,
          },
        });

        if (!rentalRequest) {
          throw new AppError("Rental request not found", 404);
        }

        if (rentalRequest.tenantId !== tenantId) {
          throw new AppError(
            "You cannot pay for another tenant's rental request",
            403,
          );
        }

        if (rentalRequest.status === "ACTIVE" || rentalRequest.status === "COMPLETED") {
          throw new AppError(
            "This rental request has already been paid and activated",
            409,
          );
        }

        if (rentalRequest.status !== "APPROVED") {
          throw new AppError(
            "Payment is only allowed for approved rental requests",
            409,
          );
        }

        if (rentalRequest.property.status !== "AVAILABLE") {
          throw new AppError(
            "This property is no longer available for payment",
            409,
          );
        }

        // Prevent duplicate successful payments
        const completedPayment = await tx.payment.findFirst({
          where: {
            rentalRequestId: rentalRequest.id,
            status: "COMPLETED",
          },
        });

        if (completedPayment) {
          throw new AppError("This rental request has already been paid", 409);
        }

        // Check for an existing pending payment
        const existingPending = await tx.payment.findFirst({
          where: {
            rentalRequestId: rentalRequest.id,
            status: "PENDING",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return {
          rentalRequest,
          existingPending,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const { rentalRequest, existingPending } = setup;

    // Step 2: If an existing pending payment exists, reconcile or retire it safely
    if (existingPending) {
      if (existingPending.transactionId) {
        let queryResult;
        try {
          queryResult = await querySSLTransaction(existingPending.transactionId);
        } catch {
          queryResult = null;
        }

        if (queryResult && queryResult.APIConnect === "DONE") {
          // Check if gateway reports this transaction is already VALID or VALIDATED
          const validTrans = queryResult.element?.find(
            (item) =>
              item.tran_id === existingPending.transactionId &&
              (item.status === "VALID" || item.status === "VALIDATED"),
          );

          if (validTrans) {
            // Auto-reconcile and complete the payment
            const completedPayment = await verifyAndCompletePayment(
              existingPending.id,
              validTrans.val_id,
            );

            res.status(200).json({
              success: true,
              message:
                "Previous transaction was verified and rental activated successfully",
              data: {
                payment: completedPayment,
                rentalStatus: "ACTIVE",
                propertyStatus: "RENTED",
              },
            });
            return;
          }
        }
      }

      // If not successfully paid, retire the old pending session to prevent stale URL reuse
      await prisma.payment.updateMany({
        where: {
          id: existingPending.id,
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
        },
      });
    }

    // Step 3: Create a fresh payment attempt with a new unique transaction ID
    const amount = new Prisma.Decimal(rentalRequest.property.monthlyRent)
      .plus(rentalRequest.property.securityDeposit ?? new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    if (amount.lessThan(10) || amount.greaterThan(500000)) {
      throw new AppError(
        "Payment amount must be between 10 and 500000 BDT",
        400,
      );
    }

    const transactionId = `RN${randomBytes(13).toString("hex").toUpperCase()}`;

    const newPayment = await prisma.payment.create({
      data: {
        rentalRequestId: rentalRequest.id,
        transactionId,
        amount,
        currency: "BDT",
        provider: "SSLCOMMERZ",
        status: "PENDING",
      },
    });

    // Step 4: Request a fresh payment session from SSLCommerz
    const payload: Record<string, string> = {
      total_amount: newPayment.amount.toFixed(2),
      currency: "BDT",
      tran_id: newPayment.transactionId!,

      product_category: "Real Estate Rental",
      product_name: rentalRequest.property.title.slice(0, 255),
      product_profile: "general",

      success_url: callbackUrl,
      fail_url: callbackUrl,
      cancel_url: callbackUrl,
      ipn_url: callbackUrl,

      cus_name: rentalRequest.tenant.name.slice(0, 50),
      cus_email: rentalRequest.tenant.email.slice(0, 50),
      cus_phone: data.customerPhone,

      cus_add1: data.customerAddress,
      cus_city: data.customerCity,
      cus_postcode: data.customerPostcode,
      cus_country: "Bangladesh",

      shipping_method: "NO",
      emi_option: "0",
      num_of_item: "1",

      value_a: newPayment.id,
      value_b: rentalRequest.id,
    };

    let gatewayResponse;
    try {
      gatewayResponse = await initiateSSLPayment(payload);
    } catch (err) {
      await prisma.payment.update({
        where: { id: newPayment.id },
        data: { status: "FAILED" },
      });
      throw err;
    }

    // Step 5: Save gateway session key and URL
    const readyPayment = await prisma.payment.update({
      where: { id: newPayment.id },
      data: {
        gatewaySessionId: gatewayResponse.sessionkey,
        gatewayUrl: gatewayResponse.GatewayPageURL,
      },
    });

    res.status(201).json({
      success: true,
      message: "Payment session created successfully",
      data: {
        paymentId: readyPayment.id,
        transactionId: readyPayment.transactionId,
        amount: readyPayment.amount.toString(),
        currency: readyPayment.currency,
        provider: readyPayment.provider,
        status: readyPayment.status,
        checkoutUrl: readyPayment.gatewayUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 2. CONFIRM / VERIFY PAYMENT
// ===========================

export const confirmPayment: RequestHandler = async (req, res, next) => {
  try {
    // Collect parameters from body (POST from SSLCommerz or JSON) and query string (GET redirects)
    const rawData = {
      ...req.query,
      ...req.body,
    };

    const parsed = paymentCallbackSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new AppError(
        "Invalid payment callback data",
        400,
        parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    const { tran_id, val_id, status } = parsed.data;

    const payment = await prisma.payment.findUnique({
      where: { transactionId: tran_id },
    });

    if (!payment) {
      throw new AppError("Payment transaction not found", 404);
    }

    // Idempotency: duplicate callbacks
    if (payment.status === "COMPLETED") {
      res.status(200).json({
        success: true,
        message: "Payment has already been confirmed",
        data: payment,
      });
      return;
    }

    const gatewayStatus = String(status ?? "").toUpperCase();

    // Handle failure / cancellation
    if (gatewayStatus === "FAILED" || gatewayStatus === "CANCELLED") {
      const updatedStatus =
        gatewayStatus === "CANCELLED" ? "CANCELLED" : "FAILED";
      await prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: updatedStatus },
      });

      res.status(200).json({
        success: true,
        message: `Payment ${updatedStatus.toLowerCase()}`,
        data: null,
      });
      return;
    }

    // Verify and complete server-to-server
    const completedPayment = await verifyAndCompletePayment(payment.id, val_id);

    res.status(200).json({
      success: true,
      message: "Payment verified and rental activated successfully",
      data: {
        payment: completedPayment,
        rentalStatus: "ACTIVE",
        propertyStatus: "RENTED",
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 3. GET PAYMENT HISTORY
// ===========================

export const getMyPayments: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const tenantId = req.user.id;
    const query = res.locals.validatedQuery as PaymentQueryInput;
    const { status, page, limit } = query;

    const where: Prisma.PaymentWhereInput = {
      rentalRequest: {
        is: {
          tenantId,
        },
      },
      ...(status ? { status } : {}),
    };

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          rentalRequest: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  city: true,
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "Payment history retrieved successfully",
      data: {
        payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 4. GET SINGLE PAYMENT
// ===========================

export const getPaymentById: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        rentalRequest: {
          is: {
            tenantId: req.user.id,
          },
        },
      },
      include: {
        rentalRequest: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Payment details retrieved successfully",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};
