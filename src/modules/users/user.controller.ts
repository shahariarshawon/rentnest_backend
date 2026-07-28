import type { Request, Response } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import { changePassword, getUserProfile, updateUserProfile } from "./user.service.js";

export async function getProfile(_req: Request, res: Response) {
  const userId = res.locals.user.id;
  const profile = await getUserProfile(userId);
  return sendSuccess(res, 200, "User profile retrieved successfully", profile);
}

export async function updateProfile(_req: Request, res: Response) {
  const userId = res.locals.user.id;
  const data = res.locals.validated.body;
  const updatedProfile = await updateUserProfile(userId, data);
  return sendSuccess(res, 200, "Profile updated successfully", updatedProfile);
}

export async function updatePassword(_req: Request, res: Response) {
  const userId = res.locals.user.id;
  const data = res.locals.validated.body;
  const result = await changePassword(userId, data);
  return sendSuccess(res, 200, result.message);
}
