
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

import {
  paymentCallbackSchema,
} from "../validations/payment.validation.js";


// ===========================
// 1. CREATE PAYMENT SESSION
// ===========================

export const createPayment: RequestHandler = async (
  req,
  res,
  next
) => {
  let paymentId: string | undefined;

  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const tenantId = req.user.id;

    const data = req.body as CreatePaymentInput;

    // Validate callback URL configuration
    const apiBaseUrl = process.env.API_BASE_URL;

    if (!apiBaseUrl) {
      throw new AppError(
        "API_BASE_URL is not configured",
        500
      );
    }

    const callbackUrl =
      `${apiBaseUrl.replace(/\/+$/, "")}/api/payments/confirm`;

    // Create payment record using a database transaction
    const setup = await prisma.$transaction(
      async (tx) => {

        // Find rental request
        const rentalRequest =
          await tx.rentalRequest.findUnique({
            where: {
              id: data.rentalRequestId,
            },
            include: {
              tenant: true,
              property: true,
            },
          });

        if (!rentalRequest) {
          throw new AppError(
            "Rental request not found",
            404
          );
        }

        // Verify tenant ownership
        if (rentalRequest.tenantId !== tenantId) {
          throw new AppError(
            "You cannot pay for another tenant's rental request",
            403
          );
        }

        // Payment only allowed after approval
        if (rentalRequest.status !== "APPROVED") {
          throw new AppError(
            "Payment is only allowed for approved rental requests",
            409
          );
        }

        if (
          rentalRequest.property.status !== "AVAILABLE"
        ) {
          throw new AppError(
            "This property is no longer available for payment",
            409
          );
        }

        // Prevent duplicate successful payments
        const completedPayment =
          await tx.payment.findFirst({
            where: {
              rentalRequestId: rentalRequest.id,
              status: "COMPLETED",
            },
          });

        if (completedPayment) {
          throw new AppError(
            "This rental request has already been paid",
            409
          );
        }

        // Reuse an existing pending checkout session
        const existingPending =
          await tx.payment.findFirst({
            where: {
              rentalRequestId: rentalRequest.id,
              status: "PENDING",
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        if (existingPending) {
          if (existingPending.gatewayUrl) {
            return {
              payment: existingPending,
              rentalRequest,
              reused: true,
            };
          }

          throw new AppError(
            "Payment session is currently being initialized. Please try again shortly.",
            409
          );
        }

        // Calculate amount from trusted database values
        const amount = new Prisma.Decimal(
          rentalRequest.property.monthlyRent
        ).plus(
          rentalRequest.property.securityDeposit ??
            new Prisma.Decimal(0)
        ).toDecimalPlaces(2);

        // SSLCommerz transaction limit
        if (
          amount.lessThan(10) ||
          amount.greaterThan(500000)
        ) {
          throw new AppError(
            "Payment amount must be between 10 and 500000 BDT",
            400
          );
        }

        // Unique transaction reference (28 characters)
        const transactionId =
          `RN${randomBytes(13).toString("hex").toUpperCase()}`;

        // Create pending payment
        const payment = await tx.payment.create({
          data: {
            rentalRequestId: rentalRequest.id,
            transactionId,
            amount,
            currency: "BDT",
            provider: "SSLCOMMERZ",
            status: "PENDING",
          },
        });

        return {
          payment,
          rentalRequest,
          reused: false,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    paymentId = setup.payment.id;

    // Return existing payment session if one is already available
    if (setup.reused) {
      res.status(200).json({
        success: true,
        message: "Existing payment session retrieved",
        data: {
          paymentId: setup.payment.id,
          transactionId: setup.payment.transactionId,
          amount: setup.payment.amount.toString(),
          currency: setup.payment.currency,
          checkoutUrl: setup.payment.gatewayUrl,
        },
      });

      return;
    }

    // Prepare SSLCommerz session data
    const payload: Record<string, string> = {
      total_amount: setup.payment.amount.toFixed(2),
      currency: "BDT",

      tran_id: setup.payment.transactionId!,

      product_category: "Real Estate Rental",
      product_name: setup.rentalRequest.property.title.slice(0, 255),
      product_profile: "general",

      success_url: callbackUrl,
      fail_url: callbackUrl,
      cancel_url: callbackUrl,
      ipn_url: callbackUrl,

      cus_name: setup.rentalRequest.tenant.name.slice(0, 50),
      cus_email: setup.rentalRequest.tenant.email.slice(0, 50),
      cus_phone: data.customerPhone,

      cus_add1: data.customerAddress,
      cus_city: data.customerCity,
      cus_postcode: data.customerPostcode,
      cus_country: "Bangladesh",

      shipping_method: "NO",
      emi_option: "0",

      num_of_item: "1",

      value_a: setup.payment.id,
      value_b: setup.rentalRequest.id,
    };

    // Request actual payment session from SSLCommerz
    let gatewayResponse;

    try {
      gatewayResponse = await initiateSSLPayment(payload);
    } catch {
      // Mark payment as failed if session creation fails
      await prisma.payment.update({
        where: {
          id: setup.payment.id,
        },
        data: {
          status: "FAILED",
        },
      });

      throw new AppError(
        "Unable to initialize SSLCommerz payment session",
        502
      );
    }

    // Save gateway session information
    const updatedPayment = await prisma.payment.update({
      where: {
        id: setup.payment.id,
      },
      data: {
        gatewaySessionId: gatewayResponse.sessionkey,
        gatewayUrl: gatewayResponse.GatewayPageURL,
      },
    });

    res.status(201).json({
      success: true,
      message: "Payment session created successfully",
      data: {
        paymentId: updatedPayment.id,
        transactionId: updatedPayment.transactionId,
        amount: updatedPayment.amount.toString(),
        currency: updatedPayment.currency,
        provider: updatedPayment.provider,
        status: updatedPayment.status,
        checkoutUrl: updatedPayment.gatewayUrl,
      },
    });

  } catch (error) {
    next(error);
  }
};


// ===========================
// 2. CONFIRM / VERIFY PAYMENT
// ===========================

export const confirmPayment: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    // Validate SSLCommerz callback data
    const parsed =
      paymentCallbackSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        "Invalid payment callback data",
        400,
        parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      );
    }

    const {
      tran_id,
      val_id,
      status,
    } = parsed.data;

    // Find our payment record
    const payment = await prisma.payment.findUnique({
      where: {
        transactionId: tran_id,
      },
    });

    if (!payment) {
      throw new AppError(
        "Payment transaction not found",
        404
      );
    }

    // Idempotency: duplicate callbacks must not
    // activate a rental more than once.
    if (payment.status === "COMPLETED") {
      res.status(200).json({
        success: true,
        message: "Payment has already been confirmed",
        data: payment,
      });

      return;
    }

    // Obtain validation ID.
    // If the callback does not contain one, query
    // SSLCommerz using our transaction reference.
    let validationId = val_id;

    if (!validationId) {
      const queryResult =
        await querySSLTransaction(tran_id);

      if (queryResult.APIConnect !== "DONE") {
        throw new AppError(
          "Unable to verify transaction with SSLCommerz",
          502
        );
      }

      const gatewayTransaction =
        queryResult.element?.find(
          (item) => item.tran_id === tran_id
        );

      if (!gatewayTransaction) {
        throw new AppError(
          "Transaction not found at payment gateway",
          404
        );
      }

      // Handle failed gateway transactions
      if (gatewayTransaction.status === "FAILED") {
        const failedStatus =
          status === "CANCELLED"
            ? "CANCELLED"
            : "FAILED";

        const updated = await prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: "PENDING",
          },
          data: {
            status: failedStatus,
          },
        });

        res.status(200).json({
          success: true,
          message:
            updated.count > 0
              ? `Payment ${failedStatus.toLowerCase()}`
              : "Payment status already processed",
          data: null,
        });

        return;
      }

      // Transaction is still waiting for completion
      if (gatewayTransaction.status === "PENDING") {
        res.status(202).json({
          success: true,
          message: "Payment is still pending at SSLCommerz",
          data: {
            transactionId: tran_id,
            status: "PENDING",
          },
        });

        return;
      }

      validationId = gatewayTransaction.val_id;
    }

    if (!validationId) {
      throw new AppError(
        "Payment validation ID is missing",
        400
      );
    }

    // Server-to-server payment validation
    const validation =
      await validateSSLPayment(validationId);

    if (
      validation.status !== "VALID" &&
      validation.status !== "VALIDATED"
    ) {
      throw new AppError(
        "SSLCommerz could not validate this payment",
        400
      );
    }

    // Verify the transaction reference
    if (validation.tran_id !== payment.transactionId) {
      throw new AppError(
        "Transaction ID mismatch",
        400
      );
    }

    // Verify amount using Decimal arithmetic
    const verifiedAmount = new Prisma.Decimal(
      validation.amount ?? "0"
    );

    if (!verifiedAmount.equals(payment.amount)) {
      throw new AppError(
        "Payment amount mismatch",
        400
      );
    }

    // Verify currency
    const gatewayCurrency =
      validation.currency_type ?? validation.currency;

    if (
      validation.currency !== "BDT" ||
      gatewayCurrency !== "BDT"
    ) {
      throw new AppError(
        "Payment currency mismatch",
        400
      );
    }

    // Risky transactions must not activate rentals
    if (Number(validation.risk_level ?? 0) === 1) {
      res.status(202).json({
        success: true,
        message:
          "Payment received but held for manual risk verification",
        data: {
          paymentId: payment.id,
          status: "PENDING",
        },
      });

      return;
    }

    // Complete payment and activate rental atomically
    const completedPayment = await prisma.$transaction(
      async (tx) => {

        const currentPayment =
          await tx.payment.findUnique({
            where: {
              id: payment.id,
            },
            include: {
              rentalRequest: {
                include: {
                  property: true,
                },
              },
            },
          });

        if (!currentPayment) {
          throw new AppError(
            "Payment record not found",
            404
          );
        }

        // Protect against duplicate callbacks
        if (currentPayment.status === "COMPLETED") {
          return currentPayment;
        }

        if (currentPayment.status !== "PENDING") {
          throw new AppError(
            "Payment is no longer pending",
            409
          );
        }

        if (
          currentPayment.rentalRequest.status !== "APPROVED"
        ) {
          throw new AppError(
            "Rental request is not approved",
            409
          );
        }

        if (
          currentPayment.rentalRequest.property.status === "RENTED"
        ) {
          throw new AppError(
            "This property has already been rented",
            409
          );
        }

        const rentalRequestId =
          currentPayment.rentalRequestId;

        const propertyId =
          currentPayment.rentalRequest.propertyId;

        // Update payment
        const updatedPayment =
          await tx.payment.update({
            where: {
              id: currentPayment.id,
            },
            data: {
              status: "COMPLETED",
              paidAt: validation.tran_date
                ? new Date(validation.tran_date)
                : new Date(),

              gatewayValidationId: validation.val_id,
              bankTransactionId:
                validation.bank_tran_id || null,

              method: validation.card_type ?? null,
            },
          });

        // Activate rental request
        await tx.rentalRequest.update({
          where: {
            id: rentalRequestId,
          },
          data: {
            status: "ACTIVE",
          },
        });

        // Mark property as rented
        await tx.property.update({
          where: {
            id: propertyId,
          },
          data: {
            status: "RENTED",
          },
        });

        // Cancel other pending requests for this property
        await tx.rentalRequest.updateMany({
          where: {
            propertyId,
            id: {
              not: rentalRequestId,
            },
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
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

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

export const getMyPayments: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const tenantId = req.user.id;

    const query =
      res.locals.validatedQuery as PaymentQueryInput;

    const {
      status,
      page,
      limit,
    } = query;

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

      prisma.payment.count({
        where,
      }),
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

export const getPaymentById: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    // Only the owner can access payment details
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
      throw new AppError(
        "Payment not found",
        404
      );
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
