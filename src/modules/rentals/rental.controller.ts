import type { Request, Response } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import {
  completeRental,
  createRentalRequest,
  getLandlordRentals,
  getRentalById,
  getTenantRentals,
  updateRentalStatus
} from "./rental.service.js";

export async function handleCreateRentalRequest(_req: Request, res: Response) {
  const tenantId = res.locals.user.id;
  const data = res.locals.validated.body;
  const rental = await createRentalRequest(tenantId, data);
  return sendSuccess(res, 201, "Rental request submitted successfully", rental);
}

export async function handleGetTenantRentals(req: Request, res: Response) {
  const tenantId = res.locals.user.id;
  const result = await getTenantRentals(tenantId, req);
  return sendSuccess(res, 200, "Rental requests retrieved successfully", result);
}

export async function handleGetLandlordRentals(req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const result = await getLandlordRentals(landlordId, req);
  return sendSuccess(res, 200, "Landlord rental requests retrieved successfully", result);
}

export async function handleGetRentalById(req: Request, res: Response) {
  const userId = res.locals.user.id;
  const userRole = res.locals.user.role;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const rental = await getRentalById(userId, userRole, id);
  return sendSuccess(res, 200, "Rental request details retrieved successfully", rental);
}

export async function handleUpdateRentalStatus(req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const { status } = res.locals.validated.body;
  const rental = await updateRentalStatus(landlordId, id, status);
  return sendSuccess(res, 200, `Rental request status updated to ${status}`, rental);
}

export async function handleCompleteRental(req: Request, res: Response) {
  const landlordId = res.locals.user.id;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const rental = await completeRental(landlordId, id);
  return sendSuccess(res, 200, "Rental marked as COMPLETED", rental);
}
