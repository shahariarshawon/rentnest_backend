import express, { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  handleConfirmPayment,
  handleCreatePaymentSession,
  handleGetPaymentById,
  handleGetUserPayments,
  handlePaymentSuccess,
  handleStripeWebhook
} from "./payment.controller.js";
import {
  confirmPaymentSchema,
  createPaymentSessionSchema,
  getPaymentByIdSchema,
  paymentSuccessSchema,
  queryPaymentSchema
} from "./payment.schema.js";

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  asyncHandler(handleStripeWebhook)
);

const router = Router();

router.get(
  "/success",
  validate(paymentSuccessSchema),
  asyncHandler(handlePaymentSuccess)
);

router.use(authenticate);

router.post(
  "/create",
  authorize(Role.TENANT),
  validate(createPaymentSessionSchema),
  asyncHandler(handleCreatePaymentSession)
);

router.post(
  "/confirm",
  validate(confirmPaymentSchema),
  asyncHandler(handleConfirmPayment)
);

router.get(
  "/",
  validate(queryPaymentSchema),
  asyncHandler(handleGetUserPayments)
);

router.get(
  "/:id",
  validate(getPaymentByIdSchema),
  asyncHandler(handleGetPaymentById)
);

export default router;
