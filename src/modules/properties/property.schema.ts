import { z } from "zod";
import { PropertyStatus } from "../../generated/prisma/client.js";

const amenitiesQuerySchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value.flatMap((item) => String(item).split(","));
    }

    if (typeof value === "string") {
      return value.split(",");
    }

    return value;
  },
  z.array(z.string().trim().min(1)).optional()
);

export const createPropertySchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    address: z.string().trim().min(3, "Address is required"),
    city: z.string().trim().min(2, "City is required"),
    area: z.string().trim().optional(),
    price: z.coerce.number().positive("Price must be a positive number"),
    bedrooms: z.coerce.number().int().min(0, "Bedrooms cannot be negative"),
    bathrooms: z.coerce.number().int().min(0, "Bathrooms cannot be negative"),
    areaSqFt: z.coerce.number().int().positive().optional(),
    amenities: z.array(z.string().trim().min(1)).max(50).default([]),
    images: z.array(z.string().url("Invalid image URL")).max(20).default([]),
    categoryId: z.string().uuid("Invalid category ID format")
  })
});

export const updatePropertySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID format")
  }),
  body: z
    .object({
      title: z.string().trim().min(3).optional(),
      description: z.string().trim().min(10).optional(),
      address: z.string().trim().min(3).optional(),
      city: z.string().trim().min(2).optional(),
      area: z.string().trim().optional(),
      price: z.coerce.number().positive().optional(),
      bedrooms: z.coerce.number().int().min(0).optional(),
      bathrooms: z.coerce.number().int().min(0).optional(),
      areaSqFt: z.coerce.number().int().positive().optional(),
      amenities: z.array(z.string().trim().min(1)).max(50).optional(),
      images: z.array(z.string().url()).max(20).optional(),
      categoryId: z.string().uuid().optional(),
      status: z.enum([PropertyStatus.AVAILABLE, PropertyStatus.UNAVAILABLE]).optional()
    })
    .refine((body) => Object.keys(body).length > 0, "At least one field is required")
});

export const updatePropertyStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID format")
  }),
  body: z.object({
    status: z.enum([PropertyStatus.AVAILABLE, PropertyStatus.UNAVAILABLE])
  })
});

export const getPropertyByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID format")
  })
});

export const queryPropertySchema = z.object({
  query: z
    .object({
      search: z.string().trim().optional(),
      location: z.string().trim().optional(),
      city: z.string().trim().optional(),
      categoryId: z.string().uuid().optional(),
      minPrice: z.coerce.number().nonnegative().optional(),
      maxPrice: z.coerce.number().positive().optional(),
      bedrooms: z.coerce.number().int().min(0).optional(),
      amenities: amenitiesQuerySchema,
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(["price", "createdAt"]).optional().default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).optional().default("desc")
    })
    .refine(
      (query) =>
        query.minPrice === undefined ||
        query.maxPrice === undefined ||
        query.minPrice <= query.maxPrice,
      {
        message: "minPrice cannot be greater than maxPrice",
        path: ["maxPrice"]
      }
    )
});

export const queryLandlordPropertiesSchema = z.object({
  query: z.object({
    status: z.enum([PropertyStatus.AVAILABLE, PropertyStatus.UNAVAILABLE]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});
