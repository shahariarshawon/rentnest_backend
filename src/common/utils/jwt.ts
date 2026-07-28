import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

function getExpirySeconds() {
  if (env.JWT_EXPIRES_IN === "1d") {
    return 60 * 60 * 24;
  }

  if (env.JWT_EXPIRES_IN === "30d") {
    return 60 * 60 * 24 * 30;
  }

  return 60 * 60 * 24 * 7;
}

export function createToken(
  userId: string,
  role: string
) {
  return jwt.sign(
    {
      sub: userId,
      role
    },
    env.JWT_SECRET,
    {
      expiresIn: getExpirySeconds()
    }
  );
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET);
}