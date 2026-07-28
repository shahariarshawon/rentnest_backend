import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { getProfile, updatePassword, updateProfile } from "./user.controller.js";
import { changePasswordSchema, updateProfileSchema } from "./user.schema.js";

const router = Router();

router.use(authenticate);

router.get("/profile", asyncHandler(getProfile));
router.patch("/profile", validate(updateProfileSchema), asyncHandler(updateProfile));
router.patch("/change-password", validate(changePasswordSchema), asyncHandler(updatePassword));

export default router;
