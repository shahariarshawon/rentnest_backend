import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { handleCreateReview, handleGetReviews } from "./review.controller.js";
import { createReviewSchema, queryReviewSchema } from "./review.schema.js";

const router = Router();

router.get(
  "/",
  validate(queryReviewSchema),
  asyncHandler(handleGetReviews)
);

router.post(
  "/",
  authenticate,
  authorize(Role.TENANT),
  validate(createReviewSchema),
  asyncHandler(handleCreateReview)
);

export default router;
