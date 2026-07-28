import { z } from "zod";
import { PropertyStatus } from "../../generated/prisma/client.js";

export const createPropertySchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    address: z.string().min(3, "Address is required"),
    city: z.string().min(2, "City is required"),
    area: z.string().optional(),
    price: z.coerce.number().positive("Price must be a positive number"),
    bedrooms: z.coerce.number().int().min(0, "Bedrooms cannot be negative"),
    bathrooms: z.coerce.number().int().min(0, "Bathrooms cannot be negative"),
    areaSqFt: z.coerce.number().int().positive().optional(),
    amenities: z.array(z.string()).default([]),
    images: z.array(z.string().url("Invalid image URL")).default([]),
    categoryId: z.string().uuid("Invalid category ID format")
  })
});

export const updatePropertySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID format")
  }),
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    address: z.string().min(3).optional(),
    city: z.string().min(2).optional(),
    area: z.string().optional(),
    price: z.coerce.number().positive().optional(),
    bedrooms: z.coerce.number().int().min(0).optional(),
    bathrooms: z.coerce.number().int().min(0).optional(),
    areaSqFt: z.coerce.number().int().positive().optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string().url()).optional(),
    categoryId: z.string().uuid().optional(),
    status: z.nativeEnum(PropertyStatus).optional()
  })
});

export const updatePropertyStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID format")
  }),
  body: z.object({
    status: z.nativeEnum(PropertyStatus)
  })
});

export const getPropertyByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID format")
  })
});

export const queryPropertySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    city: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    bedrooms: z.coerce.number().int().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sortBy: z.enum(["price", "createdAt"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc")
  })
});
