import { z } from "zod";
import { RentalStatus } from "../../generated/prisma/client.js";

export const createRentalRequestSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid("Invalid property ID format"),
    moveInDate: z
      .string()
      .datetime({ message: "Invalid move-in date format. Must be an ISO datetime string" })
      .refine(
        (value) => new Date(value).getTime() > Date.now(),
        "Move-in date must be in the future"
      ),
    durationMonths: z.coerce
      .number()
      .int()
      .min(1, "Duration must be at least 1 month")
      .max(120, "Duration cannot exceed 120 months"),
    message: z.string().trim().max(1000).optional()
  })
});

export const updateRentalStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid rental request ID format")
  }),
  body: z.object({
    status: z.enum([RentalStatus.APPROVED, RentalStatus.REJECTED], {
      message: "Status must be either APPROVED or REJECTED"
    })
  })
});

export const getRentalByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid rental request ID format")
  })
});

export const queryRentalSchema = z.object({
  query: z.object({
    status: z.nativeEnum(RentalStatus).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});
