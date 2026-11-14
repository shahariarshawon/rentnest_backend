import type { ErrorRequestHandler, RequestHandler } from "express";

import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import { AppError } from "../utils/appError.js";

// Handle unknown routes
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

// Centralized error handler
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = "Internal server error";
  let errorDetails: unknown = null;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorDetails = error.errorDetails ?? null;
  } else if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "body" in error
  ) {
    // Catch malformed JSON from body-parser
    statusCode = 400;
    message = "Invalid JSON payload in request body";
    errorDetails = null;
  } else if (error instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    message = "Authentication token has expired";
    errorDetails = null;
  } else if (error instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    message = "Invalid or expired authentication token";
    errorDetails = null;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Request validation failed";
    errorDetails = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (typeof error === "object" && error !== null && "code" in error) {
    const prismaError = error as {
      code?: string;
      meta?: {
        target?: unknown;
        field_name?: unknown;
      };
    };

    if (prismaError.code === "P2002") {
      statusCode = 409;
      message = "A record with this information already exists";
      errorDetails = {
        target: prismaError.meta?.target ?? null,
      };
    } else if (prismaError.code === "P2003") {
      statusCode = 400;
      message = "Referenced relation or foreign record does not exist";
      errorDetails = null;
    } else if (prismaError.code === "P2023") {
      statusCode = 400;
      message = "Invalid identifier or UUID provided";
      errorDetails = null;
    } else if (prismaError.code === "P2025") {
      statusCode = 404;
      message = "Requested record was not found";
      errorDetails = null;
    } else if (prismaError.code === "P2034") {
      statusCode = 409;
      message =
        "A concurrent database update occurred. Please refresh and try again.";
      errorDetails = null;
    }
  }

  if (statusCode === 500) {
    console.error("Unhandled Server Error:", error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorDetails,
  });
};
