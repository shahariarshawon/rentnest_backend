import { z } from "zod";
import { Role } from "../../generated/prisma/client.js";

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Name must contain at least 2 characters"
      )
      .max(
        80,
        "Name cannot exceed 80 characters"
      ),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(
        "Please provide a valid email address"
      ),

    password: z
      .string()
      .min(
        8,
        "Password must contain at least 8 characters"
      ),

    phone: z
      .string()
      .trim()
      .min(
        7,
        "Phone number must contain at least 7 characters"
      )
      .max(
        20,
        "Phone number cannot exceed 20 characters"
      )
      .optional(),

    role: z.union([
      z.literal(Role.TENANT),
      z.literal(Role.LANDLORD)
    ])
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(
        "Please provide a valid email address"
      ),

    password: z
      .string()
      .min(
        1,
        "Password is required"
      )
  })
});