import { Prisma, PropertyStatus, RentalStatus, Role } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../common/errors/AppError.js";
import {
  formatPaginatedResponse,
  getPaginationParams
} from "../../common/utils/pagination.js";
import type { Request } from "express";

export async function createRentalRequest(
  tenantId: string,
  data: {
    propertyId: string;
    moveInDate: string;
    durationMonths: number;
    message?: string;
  }
) {
  const property = await prisma.property.findUnique({
    where: { id: data.propertyId }
  });

  if (!property || property.isDeleted) {
    throw new AppError("Property not found", 404);
  }

  if (property.status !== PropertyStatus.AVAILABLE) {
    throw new AppError("Property is currently not available for rental", 400);
  }

  if (property.landlordId === tenantId) {
    throw new AppError("Landlord cannot submit a rental request for their own property", 400);
  }

  const existingPending = await prisma.rentalRequest.findFirst({
    where: {
      tenantId,
      propertyId: data.propertyId,
      status: { in: [RentalStatus.PENDING, RentalStatus.APPROVED, RentalStatus.ACTIVE] }
    }
  });

  if (existingPending) {
    throw new AppError("You already have an active or pending request for this property", 400);
  }

  const priceNum = Number(property.price);
  const totalAmount = priceNum * data.durationMonths;

  const rentalRequest = await prisma.rentalRequest.create({
    data: {
      tenantId,
      landlordId: property.landlordId,
      propertyId: data.propertyId,
      moveInDate: new Date(data.moveInDate),
      durationMonths: data.durationMonths,
      message: data.message,
      totalAmount,
      status: RentalStatus.PENDING
    },
    include: {
      property: {
        select: { id: true, title: true, address: true, city: true, price: true, images: true }
      },
      landlord: {
        select: { id: true, name: true, email: true, phone: true }
      }
    }
  });

  return rentalRequest;
}

export async function getTenantRentals(tenantId: string, req: Request) {
  const pagination = getPaginationParams(req);
  const { status } = req.query as { status?: RentalStatus };

  const where: Prisma.RentalRequestWhereInput = {
    tenantId
  };

  if (status) {
    where.status = status;
  }

  const [rentals, total] = await Promise.all([
    prisma.rentalRequest.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: { id: true, title: true, address: true, city: true, price: true, images: true }
        },
        landlord: {
          select: { id: true, name: true, email: true, phone: true }
        },
        payment: {
          select: { id: true, status: true, amount: true, paidAt: true, transactionId: true }
        },
        review: {
          select: { id: true, rating: true, comment: true, createdAt: true }
        }
      }
    }),
    prisma.rentalRequest.count({ where })
  ]);

  return formatPaginatedResponse(rentals, total, pagination);
}

export async function getLandlordRentals(landlordId: string, req: Request) {
  const pagination = getPaginationParams(req);
  const { status } = req.query as { status?: RentalStatus };

  const where: Prisma.RentalRequestWhereInput = {
    landlordId
  };

  if (status) {
    where.status = status;
  }

  const [rentals, total] = await Promise.all([
    prisma.rentalRequest.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: { id: true, title: true, address: true, city: true, price: true }
        },
        tenant: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
        },
        payment: {
          select: { id: true, status: true, amount: true, paidAt: true }
        }
      }
    }),
    prisma.rentalRequest.count({ where })
  ]);

  return formatPaginatedResponse(rentals, total, pagination);
}

export async function getRentalById(userId: string, userRole: string, id: string) {
  const rental = await prisma.rentalRequest.findUnique({
    where: { id },
    include: {
      property: true,
      tenant: {
        select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
      },
      landlord: {
        select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
      },
      payment: true,
      review: true
    }
  });

  if (!rental) {
    throw new AppError("Rental request not found", 404);
  }

  if (userRole !== Role.ADMIN && rental.tenantId !== userId && rental.landlordId !== userId) {
    throw new AppError("You do not have permission to view this rental request", 403);
  }

  return rental;
}

export async function updateRentalStatus(
  landlordId: string,
  id: string,
  status: typeof RentalStatus.APPROVED | typeof RentalStatus.REJECTED
) {
  const rental = await prisma.rentalRequest.findUnique({
    where: { id },
    include: { property: true }
  });

  if (!rental) {
    throw new AppError("Rental request not found", 404);
  }

  if (rental.landlordId !== landlordId) {
    throw new AppError("You do not have permission to modify this rental request", 403);
  }

  if (rental.status !== RentalStatus.PENDING) {
    throw new AppError(
      `Cannot change status of a rental request that is already ${rental.status.toLowerCase()}`,
      400
    );
  }

  if (status === RentalStatus.APPROVED) {
    if (rental.property.isDeleted || rental.property.status !== PropertyStatus.AVAILABLE) {
      throw new AppError("Property is no longer available for approval", 400);
    }

    const conflictingRental = await prisma.rentalRequest.findFirst({
      where: {
        id: { not: id },
        propertyId: rental.propertyId,
        status: { in: [RentalStatus.APPROVED, RentalStatus.ACTIVE] }
      }
    });

    if (conflictingRental) {
      throw new AppError(
        "Another approved or active rental already exists for this property",
        409
      );
    }
  }

  const updatedRental = await prisma.rentalRequest.update({
    where: { id },
    data: { status },
    include: {
      property: { select: { id: true, title: true } },
      tenant: { select: { id: true, name: true, email: true } }
    }
  });

  return updatedRental;
}

export async function completeRental(landlordId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const rental = await tx.rentalRequest.findUnique({
      where: { id },
      include: { payment: true }
    });

    if (!rental) {
      throw new AppError("Rental request not found", 404);
    }

    if (rental.landlordId !== landlordId) {
      throw new AppError("You do not have permission to complete this rental", 403);
    }

    if (rental.status !== RentalStatus.ACTIVE) {
      throw new AppError("Only an ACTIVE rental can be marked COMPLETED", 400);
    }

    if (!rental.payment || rental.payment.status !== "COMPLETED") {
      throw new AppError("A completed payment is required before finishing a rental", 400);
    }

    const completedRental = await tx.rentalRequest.update({
      where: { id },
      data: { status: RentalStatus.COMPLETED },
      include: {
        property: { select: { id: true, title: true } },
        tenant: { select: { id: true, name: true, email: true } },
        payment: true
      }
    });

    await tx.property.update({
      where: { id: rental.propertyId },
      data: { status: PropertyStatus.AVAILABLE }
    });

    return completedRental;
  });
}
