import type { RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../utils/appError.js";

// Validate request body
export const validateBody = (schema: z.ZodType): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errorDetails = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new AppError("Request validation failed", 400, errorDetails));
    }

    req.body = result.data;
    next();
  };
};

// Validate query parameters
export const validateQuery = (schema: z.ZodType): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errorDetails = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new AppError("Invalid query parameters", 400, errorDetails));
    }

    res.locals.validatedQuery = result.data;
    next();
  };
};

// Validate URL parameters
export const validateParams = (schema: z.ZodType): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errorDetails = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new AppError("Invalid URL parameters", 400, errorDetails));
    }

    res.locals.validatedParams = result.data;
    next();
  };
};
