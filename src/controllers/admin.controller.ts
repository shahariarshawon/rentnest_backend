import type { RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";

import type {
  AdminUserQuery,
  AdminPropertyQuery,
  AdminRentalQuery,
} from "../validations/admin.validation.js";

// ===========================
// 1. GET ALL USERS
// ===========================

export const getAllUsers: RequestHandler = async (req, res, next) => {
  try {
    const query = res.locals.validatedQuery as AdminUserQuery;

    const { search, role, status, page, limit } = query;

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 2. BAN / UNBAN USER
// ===========================

export const updateUserStatus: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const adminId = req.user.id;

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const { status } = req.body as {
      status: "ACTIVE" | "BANNED";
    };

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    // Prevent an Admin from banning themselves
    if (targetUser.id === adminId && status === "BANNED") {
      throw new AppError("You cannot ban your own account", 403);
    }

    // Protect other Admin accounts
    if (targetUser.role === "ADMIN") {
      throw new AppError(
        "Admin accounts cannot be modified through this endpoint",
        403,
      );
    }

    if (targetUser.status === status) {
      throw new AppError(`User is already ${status.toLowerCase()}`, 409);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `User ${status.toLowerCase()} successfully`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 3. GET ALL PROPERTIES
// ===========================

export const getAllAdminProperties: RequestHandler = async (req, res, next) => {
  try {
    const query = res.locals.validatedQuery as AdminPropertyQuery;

    const { search, city, categoryId, status, page, limit } = query;

    const where: Prisma.PropertyWhereInput = {
      ...(status ? { status } : {}),

      ...(city
        ? {
            city: {
              contains: city,
              mode: "insensitive",
            },
          }
        : {}),

      ...(categoryId ? { categoryId } : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                address: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: true,

          landlord: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },
        },
      }),

      prisma.property.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "All properties retrieved successfully",
      data: {
        properties,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 4. GET ALL RENTAL REQUESTS
// ===========================

export const getAllAdminRentals: RequestHandler = async (req, res, next) => {
  try {
    const query = res.locals.validatedQuery as AdminRentalQuery;

    const { status, page, limit } = query;

    const where: Prisma.RentalRequestWhereInput = {
      ...(status ? { status } : {}),
    };

    const skip = (page - 1) * limit;

    const [rentals, total] = await Promise.all([
      prisma.rentalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },

          property: {
            select: {
              id: true,
              title: true,
              city: true,
              monthlyRent: true,

              landlord: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },

          payments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              provider: true,
              status: true,
              paidAt: true,
            },
          },
        },
      }),

      prisma.rentalRequest.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "All rental requests retrieved successfully",
      data: {
        rentals,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 5. CREATE CATEGORY
// ===========================

export const createAdminCategory: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as {
      name: string;
      slug: string;
      description?: string | null;
    };

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 6. UPDATE CATEGORY
// ===========================

export const updateAdminCategory: RequestHandler = async (req, res, next) => {
  try {
    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const data = req.body as {
      name?: string;
      slug?: string;
      description?: string | null;
    };

    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Category not found", 404);
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 7. DELETE CATEGORY
// ===========================

export const deleteAdminCategory: RequestHandler = async (req, res, next) => {
  try {
    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const propertyCount = await prisma.property.count({
      where: {
        categoryId: id,
      },
    });

    if (propertyCount > 0) {
      throw new AppError(
        "Cannot delete a category that is being used by properties",
        409,
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
