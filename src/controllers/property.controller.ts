import type { RequestHandler } from "express";
import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";

import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyQueryInput,
} from "../validations/property.validation.js";

// ===========================
// GET ALL PUBLIC PROPERTIES
// ===========================

export const getAllProperties: RequestHandler = async (_req, res, next) => {
  try {
    const query = res.locals.validatedQuery as PropertyQueryInput;

    const {
      search,
      city,
      area,
      category,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      amenities,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    // Public users can only see available properties
    const where: Prisma.PropertyWhereInput = {
      status: "AVAILABLE",
    };

    // Search in title, description and address
    if (search) {
      where.OR = [
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
        {
          city: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // City filter
    if (city) {
      where.city = {
        contains: city,
        mode: "insensitive",
      };
    }

    // Area filter
    if (area) {
      where.area = {
        contains: area,
        mode: "insensitive",
      };
    }

    // Category filter using category slug
    if (category) {
      where.category = {
        is: {
          slug: category,
        },
      };
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.monthlyRent = {
        ...(minPrice !== undefined && {
          gte: minPrice,
        }),
        ...(maxPrice !== undefined && {
          lte: maxPrice,
        }),
      };
    }

    // Bedroom filter
    if (bedrooms !== undefined) {
      where.bedrooms = bedrooms;
    }

    // Bathroom filter
    if (bathrooms !== undefined) {
      where.bathrooms = bathrooms;
    }

    // Amenities filter
    if (amenities) {
      const amenityList = amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (amenityList.length > 0) {
        where.amenities = {
          hasSome: amenityList,
        };
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Sorting
    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      sortBy === "monthlyRent"
        ? { monthlyRent: sortOrder }
        : { createdAt: sortOrder };

    // Fetch properties and total count
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          landlord: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      prisma.property.count({
        where,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Properties retrieved successfully",
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
// GET SINGLE PROPERTY
// ===========================

export const getPropertyById: RequestHandler = async (_req, res, next) => {
  try {
    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const property = await prisma.property.findFirst({
      where: {
        id,
        status: "AVAILABLE",
      },
      include: {
        category: true,
        landlord: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!property) {
      throw new AppError("Property not found or unavailable", 404);
    }

    res.status(200).json({
      success: true,
      message: "Property details retrieved successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// CREATE PROPERTY
// ===========================

export const createProperty: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const data = req.body as CreatePropertyInput;

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      throw new AppError("Property category not found", 404);
    }

    // Create property
    const property = await prisma.property.create({
      data: {
        ...data,
        landlordId: req.user.id,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// UPDATE PROPERTY
// ===========================

export const updateProperty: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const data = req.body as UpdatePropertyInput;

    // Find property
    const existingProperty = await prisma.property.findUnique({
      where: {
        id,
      },
    });

    if (!existingProperty) {
      throw new AppError("Property not found", 404);
    }

    // Verify ownership
    if (existingProperty.landlordId !== req.user.id) {
      throw new AppError("You cannot update another landlord's property", 403);
    }

    // Check category if it is being changed
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: {
          id: data.categoryId,
        },
      });

      if (!category) {
        throw new AppError("Property category not found", 404);
      }
    }

    const updatedProperty = await prisma.property.update({
      where: {
        id,
      },
      data,
      include: {
        category: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: updatedProperty,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// DELETE PROPERTY
// ===========================

export const deleteProperty: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const property = await prisma.property.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            rentalRequests: true,
            reviews: true,
          },
        },
      },
    });

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    // Verify ownership
    if (property.landlordId !== req.user.id) {
      throw new AppError("You cannot delete another landlord's property", 403);
    }

    // Preserve rental and review history
    if (property._count.rentalRequests > 0 || property._count.reviews > 0) {
      throw new AppError(
        "This property has rental history or reviews. Mark it unavailable instead of deleting it.",
        409,
      );
    }

    await prisma.property.delete({
      where: {
        id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// UPDATE PROPERTY AVAILABILITY
// ===========================

export const updatePropertyStatus: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = res.locals.validatedParams as {
      id: string;
    };

    const { status } = req.body as {
      status: "AVAILABLE" | "UNAVAILABLE";
    };

    const property = await prisma.property.findUnique({
      where: {
        id,
      },
    });

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    if (property.landlordId !== req.user.id) {
      throw new AppError("You cannot change another landlord's property", 403);
    }

    if (property.status === "RENTED") {
      throw new AppError("A rented property cannot be manually updated", 409);
    }

    const updatedProperty = await prisma.property.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    res.status(200).json({
      success: true,
      message: "Property availability updated successfully",
      data: updatedProperty,
    });
  } catch (error) {
    next(error);
  }
};
