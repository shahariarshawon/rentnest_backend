
import { Router } from "express";

import {
  getAllProperties,
  getPropertyById,
} from "../controllers/property.controller.js";

import {
  validateQuery,
  validateParams,
} from "../middlewares/validate.middleware.js";

import {
  propertyQuerySchema,
  propertyIdSchema,
} from "../validations/property.validation.js";

const router = Router();

// Get all available properties with filters
router.get(
  "/",
  validateQuery(propertyQuerySchema),
  getAllProperties
);

// Get single property details
router.get(
  "/:id",
  validateParams(propertyIdSchema),
  getPropertyById
);

export default router;
