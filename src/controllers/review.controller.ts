import type { RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";

import type {
  CreateReviewInput,
  ReviewQueryInput,
} from "../validations/review.validation.js";

// ===========================
// 1. CREATE REVIEW
// ===========================

export const createReview: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const tenantId = req.user.id;

    const data = req.body as CreateReviewInput;

    // Find rental request
    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: {
        id: data.rentalRequestId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!rentalRequest) {
      throw new AppError("Rental request not found", 404);
    }

    // Verify tenant ownership
    if (rentalRequest.tenantId !== tenantId) {
      throw new AppError("You cannot review another tenant's rental", 403);
    }

    // Review only after rental completion
    if (rentalRequest.status !== "COMPLETED") {
      throw new AppError("You can only review completed rentals", 409);
    }

    // Verify successful payment
    if (rentalRequest.payments.length === 0) {
      throw new AppError(
        "A completed payment is required before reviewing",
        409,
      );
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        tenantId,
        propertyId: rentalRequest.propertyId,
        rentalRequestId: rentalRequest.id,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// 2. GET PROPERTY REVIEWS
// ===========================

export const getPropertyReviews: RequestHandler = async (req, res, next) => {
  try {
    const { propertyId } = res.locals.validatedParams as {
      propertyId: string;
    };

    const query = res.locals.validatedQuery as ReviewQueryInput;

    const { page, limit } = query;

    // Check property
    const property = await prisma.property.findUnique({
      where: {
        id: propertyId,
      },
      select: {
        id: true,
      },
    });

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    const where: Prisma.ReviewWhereInput = {
      propertyId,
    };

    const skip = (page - 1) * limit;

    const [reviews, total, aggregate] = await Promise.all([
      prisma.review.findMany({
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
            },
          },
        },
      }),

      prisma.review.count({
        where,
      }),

      prisma.review.aggregate({
        where,
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Property reviews retrieved successfully",
      data: {
        reviews,
        summary: {
          averageRating: aggregate._avg.rating ?? 0,
          totalReviews: aggregate._count.rating,
        },
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
