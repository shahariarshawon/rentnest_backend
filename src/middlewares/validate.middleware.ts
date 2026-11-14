
import type { RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../utils/appError.js";

export const validateBody = (
  schema: z.ZodType
): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errorDetails = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(
        new AppError(
          "Request validation failed",
          400,
          errorDetails
        )
      );
    }

    req.body = result.data;

    next();
  };
};
