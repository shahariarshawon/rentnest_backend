import {
  Prisma,
  RentalStatus,
  Role,
  UserStatus
} from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../common/errors/AppError.js";
import { formatPaginatedResponse, getPaginationParams } from "../../common/utils/pagination.js";
import type { Request } from "express";

export async function getAllUsers(req: Request) {
  const pagination = getPaginationParams(req);
  const { role, status, search } = req.query as {
    role?: Role;
    status?: UserStatus;
    search?: string;
  };

  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            properties: true,
            tenantRentals: true,
            landlordRentals: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  return formatPaginatedResponse(users, total, pagination);
}

export async function updateUserStatus(currentAdminId: string, targetUserId: string, status: UserStatus) {
  if (currentAdminId === targetUserId) {
    throw new AppError("You cannot change your own admin account status", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      updatedAt: true
    }
  });

  return updatedUser;
}

export async function getAllAdminProperties(req: Request) {
  const pagination = getPaginationParams(req);
  const { search, isDeleted } = req.query as { search?: string; isDeleted?: string };

  const where: Prisma.PropertyWhereInput = {};

  if (isDeleted === "true") {
    where.isDeleted = true;
  } else if (isDeleted === "false") {
    where.isDeleted = false;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } }
    ];
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        landlord: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { rentalRequests: true, reviews: true }
        }
      }
    }),
    prisma.property.count({ where })
  ]);

  return formatPaginatedResponse(properties, total, pagination);
}

export async function getAllAdminRentals(req: Request) {
  const pagination = getPaginationParams(req);
  const { status } = req.query as { status?: RentalStatus };
  const where: Prisma.RentalRequestWhereInput = status ? { status } : {};

  const [rentals, total] = await Promise.all([
    prisma.rentalRequest.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: { id: true, title: true, address: true, city: true }
        },
        tenant: {
          select: { id: true, name: true, email: true }
        },
        landlord: {
          select: { id: true, name: true, email: true }
        },
        payment: {
          select: { id: true, status: true, amount: true, paidAt: true, transactionId: true }
        }
      }
    }),
    prisma.rentalRequest.count({ where })
  ]);

  return formatPaginatedResponse(rentals, total, pagination);
}
