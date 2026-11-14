import type { RequestHandler } from "express";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";
import { verifyAccessToken } from "../utils/jwt.js";

// Authenticate user using JWT
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication token is required", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AppError("Invalid authentication token", 401);
    }

    // Verify token and get user ID
    const userId = verifyAccessToken(token);

    // Fetch current user from database
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    // Prevent banned users from accessing APIs
    if (user.status === "BANNED") {
      throw new AppError("Your account has been banned", 403);
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

// Role-based authorization
type AppRole = "TENANT" | "LANDLORD" | "ADMIN";

export const authorize = (...allowedRoles: AppRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to access this resource", 403),
      );
    }

    next();
  };
};
