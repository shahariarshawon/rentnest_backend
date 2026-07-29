import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
      phone: z.string().trim().min(7).max(20).optional(),
      avatarUrl: z.string().url("Invalid avatar URL").optional().nullable()
    })
    .refine((body) => Object.keys(body).length > 0, "At least one field is required")
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(128)
  })
});
