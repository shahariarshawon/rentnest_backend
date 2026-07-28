import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { validate } from "../../common/middlewares/validate.js";
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
  register
);

router.post(
  "/login",
  validate(loginSchema),
  login
);

router.get(
  "/me",
  authenticate,
  getMe
);

export default router;