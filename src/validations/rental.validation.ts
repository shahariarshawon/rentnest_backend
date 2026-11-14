
import { z } from "zod";

// ===========================
// CREATE RENTAL REQUEST
// ===========================

export const createRentalRequestSchema = z.object({
  propertyId: z
    .string()
    .uuid("Invalid property ID"),

  message: z
    .string()
    .trim()
    .min(1)
    .max(1000, "Message cannot exceed 1000 characters")
    .optional(),

  moveInDate: z
    .string()
    .datetime("Invalid move-in date"),

  leaseDurationMonths: z
    .number()
    .int()
    .min(1, "Lease duration must be at least 1 month")
    .max(120, "Lease duration cannot exceed 120 months")
    .optional(),
}).strict();


// ===========================
// LANDLORD APPROVAL / REJECTION
// ===========================

export const landlordDecisionSchema = z.object({
  status: z.enum([
    "APPROVED",
    "REJECTED",
  ]),

  landlordResponse: z
    .string()
    .trim()
    .min(1)
    .max(1000, "Response cannot exceed 1000 characters")
    .optional(),
}).strict();


// ===========================
// RENTAL REQUEST ID
// ===========================

export const rentalIdSchema = z.object({
  id: z
    .string()
    .uuid("Invalid rental request ID"),
}).strict();


// ===========================
// RENTAL HISTORY QUERY
// ===========================

export const rentalQuerySchema = z.object({
  status: z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),

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
}).strict();


// ===========================
// TYPESCRIPT TYPES
// ===========================

export type CreateRentalRequestInput =
  z.infer<typeof createRentalRequestSchema>;

export type LandlordDecisionInput =
  z.infer<typeof landlordDecisionSchema>;

export type RentalQueryInput =
  z.infer<typeof rentalQuerySchema>;
