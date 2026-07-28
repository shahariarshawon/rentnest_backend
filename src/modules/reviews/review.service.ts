import { RentalStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../common/errors/AppError.js";
import { formatPaginatedResponse, getPaginationParams } from "../../common/utils/pagination.js";
import type { Request } from "express";

export async function createReview(
  tenantId: string,
  data: {
    propertyId: string;
    rentalRequestId: string;
    rating: number;
    comment: string;
  }
) {
  const rental = await prisma.rentalRequest.findUnique({
    where: { id: data.rentalRequestId }
  });

  if (!rental) {
    throw new AppError("Rental request not found", 404);
  }

  if (rental.tenantId !== tenantId) {
    throw new AppError("You can only leave reviews for your own rental requests", 403);
  }

  if (rental.propertyId !== data.propertyId) {
    throw new AppError("Rental request does not match the specified property", 400);
  }

  if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.COMPLETED) {
    throw new AppError("You can only review properties after your rental request is ACTIVE or COMPLETED", 400);
  }

  const existingReview = await prisma.review.findUnique({
    where: { rentalRequestId: data.rentalRequestId }
  });

  if (existingReview) {
    throw new AppError("You have already reviewed this rental stay", 400);
  }

  const review = await prisma.review.create({
    data: {
      tenantId,
      propertyId: data.propertyId,
      rentalRequestId: data.rentalRequestId,
      rating: data.rating,
      comment: data.comment
    },
    include: {
      tenant: {
        select: { id: true, name: true, avatarUrl: true }
      },
      property: {
        select: { id: true, title: true }
      }
    }
  });

  return review;
}

export async function getReviews(req: Request) {
  const pagination = getPaginationParams(req);
  const { propertyId } = req.query as { propertyId?: string };

  const where: Record<string, unknown> = {};
  if (propertyId) {
    where.propertyId = propertyId;
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: { id: true, name: true, avatarUrl: true }
        },
        property: {
          select: { id: true, title: true, city: true }
        }
      }
    }),
    prisma.review.count({ where })
  ]);

  return formatPaginatedResponse(reviews, total, pagination);
}
