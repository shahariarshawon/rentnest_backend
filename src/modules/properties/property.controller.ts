import type { Request, Response } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import {
  createProperty,
  deleteProperty,
  getAllPublicProperties,
  getLandlordProperties,
  getPropertyById,
  updateProperty,
  updatePropertyStatus
} from "./property.service.js";

export async function handleGetAllProperties(req: Request, res: Response) {
  const result = await getAllPublicProperties(req);
  return sendSuccess(res, 200, "Properties retrieved successfully", result);
}

export async function handleGetPropertyById(req: Request, res: Response) {
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const property = await getPropertyById(id);
  return sendSuccess(res, 200, "Property details retrieved successfully", property);
}

export async function handleCreateProperty(_req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const data = res.locals.validated.body;
  const property = await createProperty(landlordId, data);
  return sendSuccess(res, 201, "Property listing created successfully", property);
}

export async function handleUpdateProperty(req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const data = res.locals.validated.body;
  const property = await updateProperty(landlordId, id, data);
  return sendSuccess(res, 200, "Property updated successfully", property);
}

export async function handleDeleteProperty(req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const result = await deleteProperty(landlordId, id);
  return sendSuccess(res, 200, result.message);
}

export async function handleUpdatePropertyStatus(req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const { status } = res.locals.validated.body;
  const property = await updatePropertyStatus(landlordId, id, status);
  return sendSuccess(res, 200, "Property status updated successfully", property);
}

export async function handleGetLandlordProperties(req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const result = await getLandlordProperties(landlordId, req);
  return sendSuccess(res, 200, "Landlord properties retrieved successfully", result);
}
