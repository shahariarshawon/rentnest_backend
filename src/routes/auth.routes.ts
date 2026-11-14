import { Router } from "express";

import { register, login, getMe } from "../controllers/auth.controller.js";

import { authenticate } from "../middlewares/auth.milddleware.js";

import { validateBody } from "../middlewares/validate.middleware.js";

import { registerSchema, loginSchema } from "../validations/auth.validation.js";

const router = Router();

// Register tenant or landlord
router.post("/register", validateBody(registerSchema), register);

// Login tenant, landlord or admin
router.post("/login", validateBody(loginSchema), login);

// Get current authenticated user
router.get("/me", authenticate, getMe);

export default router;
