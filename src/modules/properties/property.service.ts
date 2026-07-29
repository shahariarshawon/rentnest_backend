import { Prisma, PropertyStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../common/errors/AppError.js";
import {
  formatPaginatedResponse,
  getPaginationParams
} from "../../common/utils/pagination.js";
import type { Request } from "express";

export interface PropertyFilterQuery {
  search?: string;
  location?: string;
  city?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  amenities?: string[];
  sortBy?: "price" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export async function getAllPublicProperties(
  req: Request,
  query: PropertyFilterQuery
) {
  const pagination = getPaginationParams(req);
  const {
    search,
    location,
    city,
    categoryId,
    minPrice,
    maxPrice,
    bedrooms,
    amenities,
    sortBy = "createdAt",
    sortOrder = "desc"
  } = query;

  const where: Prisma.PropertyWhereInput = {
    isDeleted: false,
    status: PropertyStatus.AVAILABLE
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } }
    ];
  }

  if (location) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { city: { contains: location, mode: "insensitive" } },
          { area: { contains: location, mode: "insensitive" } },
          { address: { contains: location, mode: "insensitive" } }
        ]
      }
    ];
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (bedrooms !== undefined) {
    where.bedrooms = bedrooms;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  if (amenities?.length) {
    where.amenities = { hasEvery: amenities };
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        },
        landlord: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
        },
        _count: {
          select: { reviews: true }
        }
      }
    }),
    prisma.property.count({ where })
  ]);

  return formatPaginatedResponse(properties, total, pagination);
}

export async function getPropertyById(id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      category: true,
      landlord: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          createdAt: true
        }
      },
      reviews: {
        include: {
          tenant: {
            select: { id: true, name: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!property || property.isDeleted) {
    throw new AppError("Property not found", 404);
  }

  return property;
}

export async function createProperty(
  landlordId: string,
  data: {
    title: string;
    description: string;
    address: string;
    city: string;
    area?: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    areaSqFt?: number;
    amenities: string[];
    images: string[];
    categoryId: string;
  }
) {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId }
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const property = await prisma.property.create({
    data: {
      ...data,
      landlordId
    },
    include: {
      category: true,
      landlord: {
        select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
      }
    }
  });

  return property;
}

export async function updateProperty(
  landlordId: string,
  propertyId: string,
  data: {
    title?: string;
    description?: string;
    address?: string;
    city?: string;
    area?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    areaSqFt?: number;
    amenities?: string[];
    images?: string[];
    categoryId?: string;
    status?: PropertyStatus;
  }
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });

  if (!property || property.isDeleted) {
    throw new AppError("Property not found", 404);
  }

  if (property.landlordId !== landlordId) {
    throw new AppError("You do not have permission to update this property", 403);
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });
    if (!category) {
      throw new AppError("Category not found", 404);
    }
  }

  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data,
    include: {
      category: true,
      landlord: {
        select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
      }
    }
  });

  return updatedProperty;
}

export async function deleteProperty(landlordId: string, propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });

  if (!property || property.isDeleted) {
    throw new AppError("Property not found", 404);
  }

  if (property.landlordId !== landlordId) {
    throw new AppError("You do not have permission to delete this property", 403);
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { isDeleted: true, status: PropertyStatus.UNAVAILABLE }
  });

  return { message: "Property listing removed successfully" };
}

export async function updatePropertyStatus(
  landlordId: string,
  propertyId: string,
  status: PropertyStatus
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });

  if (!property || property.isDeleted) {
    throw new AppError("Property not found", 404);
  }

  if (property.landlordId !== landlordId) {
    throw new AppError("You do not have permission to update status for this property", 403);
  }

  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { status },
    include: {
      category: true
    }
  });

  return updatedProperty;
}

export async function getLandlordProperties(
  landlordId: string,
  req: Request,
  query: { status?: PropertyStatus }
) {
  const pagination = getPaginationParams(req);

  const where: Prisma.PropertyWhereInput = {
    landlordId,
    isDeleted: false,
    ...(query.status ? { status: query.status } : {})
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        _count: {
          select: { rentalRequests: true, reviews: true }
        }
      }
    }),
    prisma.property.count({ where })
  ]);

  return formatPaginatedResponse(properties, total, pagination);
}
