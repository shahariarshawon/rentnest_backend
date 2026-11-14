import { Router } from "express";

import {
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
} from "../controllers/property.controller.js";
import {
  getLandlordRentalRequests,
  updateRentalRequestStatus,
  completeRentalRequest,
} from "../controllers/rental.controller.js";

import { authenticate, authorize } from "../middlewares/auth.milddleware.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validate.middleware.js";

import {
  createPropertySchema,
  updatePropertySchema,
  propertyStatusSchema,
  propertyIdSchema,
} from "../validations/property.validation.js";

import {
  landlordDecisionSchema,
  rentalIdSchema,
  rentalQuerySchema,
} from "../validations/rental.validation.js";

const router = Router();

// Authentication and landlord authorization
router.use(authenticate);
router.use(authorize("LANDLORD"));

// ===========================
// PROPERTY MANAGEMENT
// ===========================

// Create property
router.post("/properties", validateBody(createPropertySchema), createProperty);

// Update property
router.put(
  "/properties/:id",
  validateParams(propertyIdSchema),
  validateBody(updatePropertySchema),
  updateProperty,
);

// Delete property
router.delete(
  "/properties/:id",
  validateParams(propertyIdSchema),
  deleteProperty,
);

// Update property availability
router.patch(
  "/properties/:id/status",
  validateParams(propertyIdSchema),
  validateBody(propertyStatusSchema),
  updatePropertyStatus,
);

// ===========================
// RENTAL REQUEST MANAGEMENT
// ===========================

// Get all requests for landlord's properties
router.get(
  "/requests",
  validateQuery(rentalQuerySchema),
  getLandlordRentalRequests,
);

// Approve or reject rental request
router.patch(
  "/requests/:id",
  validateParams(rentalIdSchema),
  validateBody(landlordDecisionSchema),
  updateRentalRequestStatus,
);
// Complete an active rental
router.patch(
  "/requests/:id/complete",
  validateParams(rentalIdSchema),
  completeRentalRequest,
);
export default router;
