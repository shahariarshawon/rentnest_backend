import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  handleCompleteRental,
  handleCreateRentalRequest,
  handleGetLandlordRentals,
  handleGetRentalById,
  handleGetTenantRentals,
  handleUpdateRentalStatus
} from "./rental.controller.js";
import {
  createRentalRequestSchema,
  getRentalByIdSchema,
  queryRentalSchema,
  updateRentalStatusSchema
} from "./rental.schema.js";

// Tenant / General rental router (/api/rentals)
export const tenantRentalRouter = Router();

tenantRentalRouter.use(authenticate);

tenantRentalRouter.post(
  "/",
  authorize(Role.TENANT),
  validate(createRentalRequestSchema),
  asyncHandler(handleCreateRentalRequest)
);

tenantRentalRouter.get(
  "/",
  authorize(Role.TENANT),
  validate(queryRentalSchema),
  asyncHandler(handleGetTenantRentals)
);

tenantRentalRouter.get(
  "/:id",
  validate(getRentalByIdSchema),
  asyncHandler(handleGetRentalById)
);

// Landlord rental router (/api/landlord/requests)
export const landlordRentalRouter = Router();

landlordRentalRouter.use(authenticate, authorize(Role.LANDLORD));

landlordRentalRouter.get(
  "/",
  validate(queryRentalSchema),
  asyncHandler(handleGetLandlordRentals)
);

landlordRentalRouter.patch(
  "/:id/complete",
  validate(getRentalByIdSchema),
  asyncHandler(handleCompleteRental)
);

landlordRentalRouter.patch(
  "/:id",
  validate(updateRentalStatusSchema),
  asyncHandler(handleUpdateRentalStatus)
);
