import type { RequestHandler } from "express";
import type { Role } from "../../generated/prisma/client.js";
import { AppError } from "../errors/AppError.js";

export function authorize(
  ...allowedRoles: Role[]
): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.user;

    if (
      !user ||
      !allowedRoles.includes(user.role)
    ) {
      throw new AppError(
        "You do not have permission to perform this action",
        403
      );
    }

    next();
  };
}