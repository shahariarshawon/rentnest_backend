
import { Router } from "express";

import {
  createRentalRequest,
  getMyRentalRequests,
  getRentalRequestById,
} from "../controllers/rental.controller.js";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";

import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middlewares/validate.middleware.js";

import {
  createRentalRequestSchema,
  rentalQuerySchema,
  rentalIdSchema,
} from "../validations/rental.validation.js";

const router = Router();

// All rental routes require authentication
router.use(authenticate);

// Only tenants can use these routes
router.use(authorize("TENANT"));


// Submit rental request
router.post(
  "/",
  validateBody(createRentalRequestSchema),
  createRentalRequest
);

// Get tenant rental history
router.get(
  "/",
  validateQuery(rentalQuerySchema),
  getMyRentalRequests
);

// Get individual rental request details
router.get(
  "/:id",
  validateParams(rentalIdSchema),
  getRentalRequestById
);

export default router;
