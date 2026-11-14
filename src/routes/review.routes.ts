
import { Router } from "express";

import {
  createReview,
  getPropertyReviews,
} from "../controllers/review.controller.js";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validate.middleware.js";

import {
  createReviewSchema,
  propertyReviewParamsSchema,
  reviewQuerySchema,
} from "../validations/review.validation.js";

const router = Router();


// Public: Get property reviews
router.get(
  "/property/:propertyId",
  validateParams(propertyReviewParamsSchema),
  validateQuery(reviewQuerySchema),
  getPropertyReviews
);


// Protected: Create review
router.post(
  "/",
  authenticate,
  authorize("TENANT"),
  validateBody(createReviewSchema),
  createReview
);

export default router;
