import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  handleCreateCategory,
  handleDeleteCategory,
  handleGetAllCategories,
  handleGetCategoryById,
  handleUpdateCategory
} from "./category.controller.js";
import {
  createCategorySchema,
  getCategoryByIdSchema,
  updateCategorySchema
} from "./category.schema.js";

const router = Router();

router.get("/", asyncHandler(handleGetAllCategories));
router.get("/:id", validate(getCategoryByIdSchema), asyncHandler(handleGetCategoryById));

router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validate(createCategorySchema),
  asyncHandler(handleCreateCategory)
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  validate(updateCategorySchema),
  asyncHandler(handleUpdateCategory)
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  validate(getCategoryByIdSchema),
  asyncHandler(handleDeleteCategory)
);

export default router;
