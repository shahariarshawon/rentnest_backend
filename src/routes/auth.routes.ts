import { Router } from "express";

import { register, login, getMe, updateMe } from "../controllers/auth.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

import { validateBody } from "../middlewares/validate.middleware.js";

import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "../validations/auth.validation.js";

const router = Router();

// Register tenant or landlord
router.post("/register", validateBody(registerSchema), register);

// Login tenant, landlord or admin
router.post("/login", validateBody(loginSchema), login);

// Get current authenticated user
router.get("/me", authenticate, getMe);

// Update authenticated user profile
router.patch("/me", authenticate, validateBody(updateProfileSchema), updateMe);

export default router;
