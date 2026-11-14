import { Router } from "express";

import {
  getAllUsers,
  updateUserStatus,
  getAllAdminProperties,
  getAllAdminRentals,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from "../controllers/admin.controller.js";

import { authenticate, authorize } from "../middlewares/auth.milddleware.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validate.middleware.js";

import {
  adminUserQuerySchema,
  updateUserStatusSchema,
  adminUserIdSchema,
  adminPropertyQuerySchema,
  adminRentalQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  adminCategoryIdSchema,
} from "../validations/admin.validation.js";

const router = Router();

// ===========================
// ADMIN AUTHORIZATION
// ===========================

router.use(authenticate);
router.use(authorize("ADMIN"));

// ===========================
// USER MANAGEMENT
// ===========================

// Get all users
router.get("/users", validateQuery(adminUserQuerySchema), getAllUsers);

// Ban / Unban user
router.patch(
  "/users/:id",
  validateParams(adminUserIdSchema),
  validateBody(updateUserStatusSchema),
  updateUserStatus,
);

// ===========================
// PROPERTY MANAGEMENT
// ===========================

// Get all properties
router.get(
  "/properties",
  validateQuery(adminPropertyQuerySchema),
  getAllAdminProperties,
);

// ===========================
// RENTAL MANAGEMENT
// ===========================

// Get all rental requests
router.get(
  "/rentals",
  validateQuery(adminRentalQuerySchema),
  getAllAdminRentals,
);

// ===========================
// CATEGORY MANAGEMENT
// ===========================

// Create category
router.post(
  "/categories",
  validateBody(createCategorySchema),
  createAdminCategory,
);

// Update category
router.patch(
  "/categories/:id",
  validateParams(adminCategoryIdSchema),
  validateBody(updateCategorySchema),
  updateAdminCategory,
);

// Delete category
router.delete(
  "/categories/:id",
  validateParams(adminCategoryIdSchema),
  deleteAdminCategory,
);

export default router;
