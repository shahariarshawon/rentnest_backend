
import jwt from "jsonwebtoken";

import { AppError } from "./appError.js";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET must be configured with at least 32 characters"
    );
  }

  return secret;
};

// Generate JWT access token
export const generateAccessToken = (
  userId: string
): string => {
  return jwt.sign(
    {
      sub: userId,
    },
    getJwtSecret(),
    {
      expiresIn: 60 * 60 * 24,
    }
  );
};

// Verify JWT access token
export const verifyAccessToken = (
  token: string
): string => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string"
  ) {
    throw new AppError("Invalid authentication token", 401);
  }

  return decoded.sub;
};
