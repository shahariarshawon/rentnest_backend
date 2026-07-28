import { Role, UserStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../common/errors/AppError.js";
import { createToken } from "../../common/utils/jwt.js";
import {
  comparePassword,
  hashPassword
} from "../../common/utils/password.js";

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: typeof Role.TENANT | typeof Role.LANDLORD;
}) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email
    }
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists",
      409
    );
  }

  const passwordHash = await hashPassword(
    data.password
  );

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone,
      role: data.role
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

  const token = createToken(
    user.id,
    user.role
  );

  return {
    user,
    token
  };
}

export async function loginUser(data: {
  email: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email
    }
  });

  if (!user) {
    throw new AppError(
      "Email or password is incorrect",
      401
    );
  }

  const passwordMatches = await comparePassword(
    data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new AppError(
      "Email or password is incorrect",
      401
    );
  }

  if (user.status === UserStatus.BANNED) {
    throw new AppError(
      "Your account has been banned",
      403
    );
  }

  const token = createToken(
    user.id,
    user.role
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    token
  };
}