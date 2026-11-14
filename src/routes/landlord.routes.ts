
import { Router } from "express";

import {
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
} from "../controllers/property.controller.js";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.milddleware.js";

import {
  validateBody,
  validateParams,
} from "../middlewares/validate.middleware.js";

import {
  createPropertySchema,
  updatePropertySchema,
  propertyStatusSchema,
  propertyIdSchema,
} from "../validations/property.validation.js";

const router = Router();

// All landlord routes require authentication
router.use(authenticate);

// All routes in this router require the LANDLORD role
router.use(authorize("LANDLORD"));


// Create property
router.post(
  "/properties",
  validateBody(createPropertySchema),
  createProperty
);

// Update property
router.put(
  "/properties/:id",
  validateParams(propertyIdSchema),
  validateBody(updatePropertySchema),
  updateProperty
);

// Delete property
router.delete(
  "/properties/:id",
  validateParams(propertyIdSchema),
  deleteProperty
);

// Update property availability
router.patch(
  "/properties/:id/status",
  validateParams(propertyIdSchema),
  validateBody(propertyStatusSchema),
  updatePropertyStatus
);

export default router;
