import type { Response } from "express";

export function sendSuccess(
  res: Response,
  statusCode: number,
  message: string,
  data: unknown = null
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}