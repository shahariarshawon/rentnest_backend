import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  handleGetAllAdminProperties,
  handleGetAllAdminRentals,
  handleGetAllUsers,
  handleUpdateUserStatus
} from "./admin.controller.js";
import {
  queryAdminPropertiesSchema,
  queryAdminRentalsSchema,
  queryAdminUsersSchema,
  updateUserStatusSchema
} from "./admin.schema.js";

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get("/users", validate(queryAdminUsersSchema), asyncHandler(handleGetAllUsers));
router.patch("/users/:id", validate(updateUserStatusSchema), asyncHandler(handleUpdateUserStatus));
router.get("/properties", validate(queryAdminPropertiesSchema), asyncHandler(handleGetAllAdminProperties));
router.get("/rentals", validate(queryAdminRentalsSchema), asyncHandler(handleGetAllAdminRentals));

export default router;
