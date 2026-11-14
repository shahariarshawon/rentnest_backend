
import { z } from "zod";

// ===========================
// CREATE PROPERTY VALIDATION
// ===========================

export const createPropertySchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must contain at least 5 characters")
    .max(150, "Title cannot exceed 150 characters"),

  description: z
    .string()
    .trim()
    .min(20, "Description must contain at least 20 characters"),

  address: z
    .string()
    .trim()
    .min(5, "Address is required"),

  area: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional(),

  city: z
    .string()
    .trim()
    .min(2, "City is required"),

  country: z
    .string()
    .trim()
    .min(2, "Country is required"),

  monthlyRent: z
    .number()
    .positive("Monthly rent must be greater than zero")
    .max(9999999999.99),

  securityDeposit: z
    .number()
    .nonnegative()
    .max(9999999999.99)
    .nullable()
    .optional(),

  bedrooms: z
    .number()
    .int()
    .min(0)
    .max(100),

  bathrooms: z
    .number()
    .int()
    .min(0)
    .max(100),

  areaSqFt: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),

  amenities: z
    .array(z.string().trim().min(1))
    .max(30)
    .default([]),

  images: z
    .array(z.string().url("Invalid image URL"))
    .max(10)
    .default([]),

  categoryId: z
    .string()
    .uuid("Invalid category ID"),

  availableFrom: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((value) =>
      value ? new Date(value) : value
    ),
}).strict();


// ===========================
// UPDATE PROPERTY VALIDATION
// ===========================

export const updatePropertySchema =
  createPropertySchema
    .partial()
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message: "Provide at least one field to update",
      }
    );


// ===========================
// PROPERTY STATUS VALIDATION
// ===========================

export const propertyStatusSchema = z.object({
  status: z.enum([
    "AVAILABLE",
    "UNAVAILABLE",
  ]),
}).strict();


// ===========================
// PROPERTY ID VALIDATION
// ===========================

export const propertyIdSchema = z.object({
  id: z
    .string()
    .uuid("Invalid property ID"),
});


// ===========================
// PROPERTY FILTER VALIDATION
// ===========================

export const propertyQuerySchema = z.object({
  search: z.string().trim().optional(),

  city: z.string().trim().optional(),

  area: z.string().trim().optional(),

  category: z.string().trim().optional(),

  minPrice: z.coerce
    .number()
    .nonnegative()
    .optional(),

  maxPrice: z.coerce
    .number()
    .positive()
    .optional(),

  bedrooms: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional(),

  bathrooms: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional(),

  amenities: z.string().optional(),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),

  sortBy: z.enum([
    "createdAt",
    "monthlyRent",
  ]).default("createdAt"),

  sortOrder: z.enum([
    "asc",
    "desc",
  ]).default("desc"),
})
  .strict()
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    {
      message: "Minimum price cannot exceed maximum price",
      path: ["maxPrice"],
    }
  );


// ===========================
// TYPESCRIPT TYPES
// ===========================

export type CreatePropertyInput =
  z.infer<typeof createPropertySchema>;

export type UpdatePropertyInput =
  z.infer<typeof updatePropertySchema>;

export type PropertyQueryInput =
  z.infer<typeof propertyQuerySchema>;
