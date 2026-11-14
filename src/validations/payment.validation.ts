
import { z } from "zod";

// ===========================
// CREATE PAYMENT
// ===========================

export const createPaymentSchema = z.object({
  rentalRequestId: z
    .string()
    .uuid("Invalid rental request ID"),

  customerPhone: z
    .string()
    .trim()
    .min(8, "Valid phone number is required")
    .max(20),

  customerAddress: z
    .string()
    .trim()
    .min(3, "Customer address is required")
    .max(50),

  customerCity: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(50),

  customerPostcode: z
    .string()
    .trim()
    .min(3, "Postcode is required")
    .max(30),
}).strict();


// ===========================
// PAYMENT ID
// ===========================

export const paymentIdSchema = z.object({
  id: z
    .string()
    .uuid("Invalid payment ID"),
}).strict();


// ===========================
// PAYMENT HISTORY QUERY
// ===========================

export const paymentQuerySchema = z.object({
  status: z.enum([
    "PENDING",
    "COMPLETED",
    "FAILED",
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
// SSLCOMMERZ CALLBACK VALIDATION
// ===========================

export const paymentCallbackSchema = z.object({
  tran_id: z
    .string()
    .min(1)
    .max(30),

  val_id: z
    .string()
    .optional(),

  status: z.enum([
    "VALID",
    "VALIDATED",
    "FAILED",
    "CANCELLED",
    "EXPIRED",
    "UNATTEMPTED",
  ]).optional(),
}).passthrough();



// ===========================
// TYPES
// ===========================

export type CreatePaymentInput =
  z.infer<typeof createPaymentSchema>;

export type PaymentQueryInput =
  z.infer<typeof paymentQuerySchema>;
