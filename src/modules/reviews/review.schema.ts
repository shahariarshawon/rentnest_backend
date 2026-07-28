import { z } from "zod";

export const createReviewSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid("Invalid property ID format"),
    rentalRequestId: z.string().uuid("Invalid rental request ID format"),
    rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
    comment: z.string().min(3, "Comment must be at least 3 characters")
  })
});

export const queryReviewSchema = z.object({
  query: z.object({
    propertyId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
  })
});
