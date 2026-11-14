
import { z } from "zod";

// Create review
export const createReviewSchema = z.object({
  rentalRequestId: z
    .string()
    .uuid("Invalid rental request ID"),

  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),

  comment: z
    .string()
    .trim()
    .max(1000, "Comment cannot exceed 1000 characters")
    .optional(),
}).strict();


// Property review params
export const propertyReviewParamsSchema = z.object({
  propertyId: z
    .string()
    .uuid("Invalid property ID"),
}).strict();


// Pagination
export const reviewQuerySchema = z.object({
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

export type CreateReviewInput =
  z.infer<typeof createReviewSchema>;

export type ReviewQueryInput =
  z.infer<typeof reviewQuerySchema>;
