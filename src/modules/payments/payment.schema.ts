import { z } from "zod";

export const createPaymentSessionSchema = z.object({
  body: z.object({
    rentalRequestId: z.string().uuid("Invalid rental request ID format")
  })
});

export const confirmPaymentSchema = z.object({
  body: z.object({
    rentalRequestId: z.string().uuid("Invalid rental request ID format"),
    stripeSessionId: z.string().optional(),
    transactionId: z.string().optional()
  })
});

export const getPaymentByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid payment ID format")
  })
});

export const queryPaymentSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
  })
});
