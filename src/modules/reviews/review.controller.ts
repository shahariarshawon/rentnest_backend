import type { Request, Response } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import { createReview, getReviews } from "./review.service.js";

export async function handleCreateReview(_req: Request, res: Response) {
  const tenantId = res.locals.user.id;
  const data = res.locals.validated.body;
  const review = await createReview(tenantId, data);
  return sendSuccess(res, 201, "Review submitted successfully", review);
}

export async function handleGetReviews(req: Request, res: Response) {
  const result = await getReviews(req);
  return sendSuccess(res, 200, "Reviews retrieved successfully", result);
}
