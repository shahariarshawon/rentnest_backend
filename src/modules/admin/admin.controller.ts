import type { Request, Response } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import {
  getAllAdminProperties,
  getAllAdminRentals,
  getAllUsers,
  updateUserStatus
} from "./admin.service.js";

export async function handleGetAllUsers(req: Request, res: Response) {
  const result = await getAllUsers(req);
  return sendSuccess(res, 200, "Users retrieved successfully", result);
}

export async function handleUpdateUserStatus(req: Request, res: Response) {
  const currentAdminId = res.locals.user.id;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const { status } = res.locals.validated.body;
  const user = await updateUserStatus(currentAdminId, id, status);
  return sendSuccess(res, 200, `User status updated to ${status}`, user);
}

export async function handleGetAllAdminProperties(req: Request, res: Response) {
  const result = await getAllAdminProperties(req);
  return sendSuccess(res, 200, "Properties retrieved successfully", result);
}

export async function handleGetAllAdminRentals(req: Request, res: Response) {
  const result = await getAllAdminRentals(req);
  return sendSuccess(res, 200, "Rental requests retrieved successfully", result);
}
