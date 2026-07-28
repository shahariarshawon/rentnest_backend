import type { RequestHandler } from "express";
import { UserStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { verifyToken } from "../utils/jwt.js";

export const authenticate: RequestHandler = async (
  req,
  res,
  next
) => {
  const authorization = req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    throw new AppError(
      "Authentication token is required",
      401
    );
  }

  const token = authorization.split(" ")[1];

  const decoded = verifyToken(token);

  if (
    typeof decoded === "string" ||
    !decoded.sub
  ) {
    throw new AppError(
      "Invalid authentication token",
      401
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.sub
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new AppError(
      "User account no longer exists",
      401
    );
  }

  if (user.status === UserStatus.BANNED) {
    throw new AppError(
      "Your account has been banned",
      403
    );
  }

  res.locals.user = user;

  next();
};