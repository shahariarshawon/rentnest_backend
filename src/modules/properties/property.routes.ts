import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { validate } from "../../common/middlewares/validate.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  handleCreateProperty,
  handleDeleteProperty,
  handleGetAllProperties,
  handleGetLandlordProperties,
  handleGetPropertyById,
  handleUpdateProperty,
  handleUpdatePropertyStatus
} from "./property.controller.js";
import {
  createPropertySchema,
  getPropertyByIdSchema,
  queryPropertySchema,
  updatePropertySchema,
  updatePropertyStatusSchema
} from "./property.schema.js";

// Public property router (/api/properties)
export const publicPropertyRouter = Router();

publicPropertyRouter.get("/", validate(queryPropertySchema), asyncHandler(handleGetAllProperties));
publicPropertyRouter.get("/:id", validate(getPropertyByIdSchema), asyncHandler(handleGetPropertyById));

// Landlord property router (/api/landlord/properties)
export const landlordPropertyRouter = Router();

landlordPropertyRouter.use(authenticate, authorize(Role.LANDLORD));

landlordPropertyRouter.post("/", validate(createPropertySchema), asyncHandler(handleCreateProperty));
landlordPropertyRouter.get("/", asyncHandler(handleGetLandlordProperties));
landlordPropertyRouter.put("/:id", validate(updatePropertySchema), asyncHandler(handleUpdateProperty));
landlordPropertyRouter.delete("/:id", validate(getPropertyByIdSchema), asyncHandler(handleDeleteProperty));
landlordPropertyRouter.patch(
  "/:id/status",
  validate(updatePropertyStatusSchema),
  asyncHandler(handleUpdatePropertyStatus)
);
