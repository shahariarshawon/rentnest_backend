
import { Router } from "express";

import {
  createPayment,
  confirmPayment,
  getMyPayments,
  getPaymentById,
} from "../controllers/payment.controller.js";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.milddleware.js";

import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middlewares/validate.middleware.js";

import {
  createPaymentSchema,
  paymentQuerySchema,
  paymentIdSchema,
} from "../validations/payment.validation.js";

const router = Router();


// ===========================
// PUBLIC GATEWAY CALLBACK
// ===========================

// SSLCommerz must access this endpoint
// without a JWT token.
// Payment is verified server-to-server.
router.post(
  "/confirm",
  confirmPayment
);


// ===========================
// PROTECTED TENANT ROUTES
// ===========================

router.use(authenticate);
router.use(authorize("TENANT"));


// Create payment session
router.post(
  "/create",
  validateBody(createPaymentSchema),
  createPayment
);

// Get payment history
router.get(
  "/",
  validateQuery(paymentQuerySchema),
  getMyPayments
);

// Get payment details
router.get(
  "/:id",
  validateParams(paymentIdSchema),
  getPaymentById
);

export default router;
