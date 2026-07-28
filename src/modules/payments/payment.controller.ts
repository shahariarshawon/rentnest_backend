import type { Request, Response } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import {
  confirmPayment,
  createPaymentSession,
  getPaymentById,
  getUserPayments
} from "./payment.service.js";

export async function handleCreatePaymentSession(_req: Request, res: Response) {
  const tenantId = res.locals.user.id;
  const { rentalRequestId } = res.locals.validated.body;
  const result = await createPaymentSession(tenantId, rentalRequestId);
  return sendSuccess(res, 201, "Payment session created successfully", result);
}

export async function handleConfirmPayment(_req: Request, res: Response) {
  const userId = res.locals.user.id;
  const userRole = res.locals.user.role;
  const data = res.locals.validated.body;
  const result = await confirmPayment(userId, userRole, data);
  return sendSuccess(res, 200, result.message, result);
}

export async function handleGetUserPayments(req: Request, res: Response) {
  const userId = res.locals.user.id;
  const userRole = res.locals.user.role;
  const result = await getUserPayments(userId, userRole, req);
  return sendSuccess(res, 200, "Payment history retrieved successfully", result);
}

export async function handleGetPaymentById(req: Request, res: Response) {
  const userId = res.locals.user.id;
  const userRole = res.locals.user.role;
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const payment = await getPaymentById(userId, userRole, id);
  return sendSuccess(res, 200, "Payment details retrieved successfully", payment);
}
