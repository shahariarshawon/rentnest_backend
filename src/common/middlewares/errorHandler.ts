import type { ErrorRequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../errors/AppError.js";
import { env } from "../../config/env.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errorDetails: error.errorDetails
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "body" in error
  ) {
    res.status(400).json({
      success: false,
      message: "Request body contains invalid JSON",
      errorDetails: null
    });
    return;
  }

  if (error instanceof jwt.TokenExpiredError) {
    res.status(401).json({
      success: false,
      message: "Authentication token has expired",
      errorDetails: null
    });
    return;
  }

  if (error instanceof jwt.JsonWebTokenError) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication token",
      errorDetails: null
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: "Database query validation failed",
      errorDetails: env.NODE_ENV === "development" ? error.message : null
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "A record with this value already exists",
        errorDetails: error.meta
      });
      return;
    }

    if (error.code === "P2003") {
      res.status(400).json({
        success: false,
        message: "The request references an invalid related record",
        errorDetails: error.meta
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Requested record was not found",
        errorDetails: null
      });
      return;
    }
  }

  console.error(error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    errorDetails:
      env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : String(error)
        : null
  });
};
