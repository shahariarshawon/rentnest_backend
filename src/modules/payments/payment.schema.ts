import { z } from "zod";

export const createPaymentSessionSchema = z.object({
  body: z.object({
    rentalRequestId: z.string().uuid("Invalid rental request ID format")
  })
});

export const confirmPaymentSchema = z.object({
  body: z.object({
    rentalRequestId: z.string().uuid("Invalid rental request ID format"),
    stripeSessionId: z.string().min(1, "Stripe session ID is required")
  })
});

export const paymentSuccessSchema = z.object({
  query: z.object({
    session_id: z.string().min(1, "Stripe session ID is required")
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
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});
