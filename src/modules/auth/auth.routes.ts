import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  getMe,
  login,
  register
} from "./auth.controller.js";
import {
  loginSchema,
  registerSchema
} from "./auth.schema.js";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(register)
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(login)
);

router.get(
  "/me",
  authenticate,
  asyncHandler(getMe)
);

export default router;