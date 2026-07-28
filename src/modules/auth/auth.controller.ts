import type { RequestHandler } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import {
  loginUser,
  registerUser
} from "./auth.service.js";

export const register: RequestHandler = async (
  _req,
  res
) => {
  const result = await registerUser(
    res.locals.validated.body
  );

  return sendSuccess(
    res,
    201,
    "Registration completed successfully",
    result
  );
};

export const login: RequestHandler = async (
  _req,
  res
) => {
  const result = await loginUser(
    res.locals.validated.body
  );

  return sendSuccess(
    res,
    200,
    "Login successful",
    result
  );
};

export const getMe: RequestHandler = async (
  _req,
  res
) => {
  return sendSuccess(
    res,
    200,
    "Current user retrieved successfully",
    {
      user: res.locals.user
    }
  );
};