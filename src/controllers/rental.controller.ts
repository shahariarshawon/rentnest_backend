import type { RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";

import type {
  CreateRentalRequestInput,
  LandlordDecisionInput,
  RentalQueryInput,
} from "../validations/rental.validation.js";

// ===========================
// 1. SUBMIT RENTAL REQUEST
// ===========================

export const createRentalRequest: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const tenantId = req.user.id;

    const data = req.body as CreateRentalRequestInput;

    const moveInDate = new Date(data.moveInDate);

    // Move-in date must be in the future
    if (moveInDate <= new Date()) {
      throw new AppError("Move-in date must be in the future", 400);
    }

    // Use a serializable transaction to protect
    // against conflicting rental requests.
    const rentalRequest = await prisma.$transaction(
      async (tx) => {
        // Check whether property exists
        const property = await tx.property.findUnique({
          where: {
            id: data.propertyId,
          },
          select: {
            id: true,
            status: true,
            availableFrom: true,
          },
        });

        if (!property) {
          throw new AppError("Property not found", 404);
        }

        // Check property availability
        if (property.status !== "AVAILABLE") {
          throw new AppError("This property is currently unavailable", 409);
        }

        // Check property availability date
        if (property.availableFrom && moveInDate < property.availableFrom) {
          throw new AppError(
            "Requested move-in date is earlier than the property's availability date",
            400,
          );
        }

        // Prevent duplicate active requests
        const existingRequest = await tx.rentalRequest.findFirst({
          where: {
            tenantId,
            propertyId: data.propertyId,
            status: {
              in: ["PENDING", "APPROVED", "ACTIVE"],
            },
          },
        });

        if (existingRequest) {
          throw new AppError(
            "You already have an active rental request for this property",
            409,
          );
        }

        // Prevent new requests if another tenant
        // already has an approved or active request.
        const propertyLocked = await tx.rentalRequest.findFirst({
          where: {
            propertyId: data.propertyId,
            status: {
              in: ["APPROVED", "ACTIVE"],
            },
          },
        });

        if (propertyLocked) {
          throw new AppError(
            "This property already has an approved or active rental request",
            409,
          );
        }

        // Create rental request
        return await tx.rentalRequest.create({
          data: {
            tenantId,
            propertyId: data.propertyId,
            message: data.message ?? null,
            moveInDate,
            leaseDurationMonths: data.leaseDurationMonths ?? null,
          },
          include: {
            property: {
              include: {
                category: true,
                landlord: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    res.status(201).json({
      success: true,
      message: "Rental request submitted successfully",
      data: rentalRequest,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 2. GET TENANT RENTAL HISTORY
// ===========================

export const getMyRentalRequests: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const tenantId = req.user.id;

    const query = res.locals.validatedQuery as RentalQueryInput;

    const { status, page, limit } = query;

    const where: Prisma.RentalRequestWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
    };

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.rentalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          property: {
            include: {
              category: true,
              landlord: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      prisma.rentalRequest.count({
        where,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Rental request history retrieved successfully",
      data: {
        requests,
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
// 3. GET SINGLE RENTAL REQUEST
// ===========================

export const getRentalRequestById: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: {
        id,
      },
      include: {
        property: {
          include: {
            category: true,
            landlord: {
              select: {
                id: true,
                name: true,
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
    });

    if (!rentalRequest) {
      throw new AppError("Rental request not found", 404);
    }

    // Tenant can only view their own request
    if (rentalRequest.tenantId !== req.user.id) {
      throw new AppError(
        "You cannot access another tenant's rental request",
        403,
      );
    }

    res.status(200).json({
      success: true,
      message: "Rental request details retrieved successfully",
      data: rentalRequest,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 4. GET LANDLORD RENTAL REQUESTS
// ===========================

export const getLandlordRentalRequests: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const landlordId = req.user.id;

    const query = res.locals.validatedQuery as RentalQueryInput;

    const { status, page, limit } = query;

    // Only requests belonging to this landlord's properties
    const where: Prisma.RentalRequestWhereInput = {
      property: {
        is: {
          landlordId,
        },
      },
      ...(status ? { status } : {}),
    };

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
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
              phone: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              monthlyRent: true,
              status: true,
            },
          },
        },
      }),

      prisma.rentalRequest.count({
        where,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Landlord rental requests retrieved successfully",
      data: {
        requests,
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
// 5. APPROVE OR REJECT REQUEST
// ===========================

export const updateRentalRequestStatus: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const landlordId = req.user.id;

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const { status, landlordResponse } = req.body as LandlordDecisionInput;

    // Use a serializable transaction to prevent
    // two landlords' decisions from approving
    // different requests for the same property.
    const updatedRequest = await prisma.$transaction(
      async (tx) => {
        // Find rental request
        const rentalRequest = await tx.rentalRequest.findUnique({
          where: {
            id,
          },
          include: {
            property: {
              select: {
                id: true,
                landlordId: true,
                status: true,
              },
            },
          },
        });

        if (!rentalRequest) {
          throw new AppError("Rental request not found", 404);
        }

        // Verify property ownership
        if (rentalRequest.property.landlordId !== landlordId) {
          throw new AppError(
            "You cannot manage requests for another landlord's property",
            403,
          );
        }

        // Only pending requests can be decided
        if (rentalRequest.status !== "PENDING") {
          throw new AppError(
            "This rental request has already been processed",
            409,
          );
        }

        // Additional checks when approving
        if (status === "APPROVED") {
          if (rentalRequest.property.status !== "AVAILABLE") {
            throw new AppError("This property is no longer available", 409);
          }

          // Check whether another request
          // is already approved or active.
          const existingApprovedRequest = await tx.rentalRequest.findFirst({
            where: {
              propertyId: rentalRequest.propertyId,
              id: {
                not: id,
              },
              status: {
                in: ["APPROVED", "ACTIVE"],
              },
            },
          });

          if (existingApprovedRequest) {
            throw new AppError(
              "Another rental request has already been approved for this property",
              409,
            );
          }
        }

        // Update request status
        return await tx.rentalRequest.update({
          where: {
            id,
          },
          data: {
            status,
            landlordResponse: landlordResponse ?? null,
            decidedAt: new Date(),
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                monthlyRent: true,
                status: true,
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    res.status(200).json({
      success: true,
      message: `Rental request ${status.toLowerCase()} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
};
