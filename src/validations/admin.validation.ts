
import { z } from "zod";


// ===========================
// USER QUERY
// ===========================

export const adminUserQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),

  role: z.enum([
    "TENANT",
    "LANDLORD",
    "ADMIN",
  ]).optional(),

  status: z.enum([
    "ACTIVE",
    "BANNED",
  ]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();


// ===========================
// UPDATE USER STATUS
// ===========================

export const updateUserStatusSchema = z.object({
  status: z.enum([
    "ACTIVE",
    "BANNED",
  ]),
}).strict();


// ===========================
// ADMIN PROPERTY QUERY
// ===========================

export const adminPropertyQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),

  city: z.string().trim().max(100).optional(),

  categoryId: z.string().uuid().optional(),

  status: z.enum([
    "AVAILABLE",
    "RENTED",
    "UNAVAILABLE",
  ]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();


// ===========================
// ADMIN RENTAL QUERY
// ===========================

export const adminRentalQuerySchema = z.object({
  status: z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();


// ===========================
// URL PARAMETERS
// ===========================

export const adminUserIdSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
}).strict();

export const adminCategoryIdSchema = z.object({
  id: z.string().uuid("Invalid category ID"),
}).strict();


// ===========================
// CATEGORY CREATION
// ===========================

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),

  slug: z.string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Invalid category slug"
    ),

  description: z.string().trim().max(500).nullable().optional(),
}).strict();


// ===========================
// CATEGORY UPDATE
// ===========================

export const updateCategorySchema =
  createCategorySchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  );


// ===========================
// TYPES
// ===========================

export type AdminUserQuery =
  z.infer<typeof adminUserQuerySchema>;

export type AdminPropertyQuery =
  z.infer<typeof adminPropertyQuerySchema>;

export type AdminRentalQuery =
  z.infer<typeof adminRentalQuerySchema>;
