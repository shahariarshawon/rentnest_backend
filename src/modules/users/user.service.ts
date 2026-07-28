import { prisma } from "../../config/prisma.js";
import { AppError } from "../../common/errors/AppError.js";
import { comparePassword, hashPassword } from "../../common/utils/password.js";

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    throw new AppError("User not found", 404);
  }

  return user;
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; phone?: string; avatarUrl?: string | null }
) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
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

  return updatedUser;
}

export async function changePassword(
  userId: string,
  data: { currentPassword: string; newPassword: string }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isMatch = await comparePassword(data.currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Incorrect current password", 400);
  }

  const passwordHash = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  return { message: "Password updated successfully" };
}
