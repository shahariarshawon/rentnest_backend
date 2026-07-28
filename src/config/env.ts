import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must contain at least 32 characters"),

  JWT_EXPIRES_IN: z
    .enum(["1d", "7d", "30d"])
    .default("7d"),

  APP_URL: z
    .string()
    .url()
    .default("http://localhost:5000"),

  STRIPE_SECRET_KEY: z
    .string()
    .optional(),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional(),

  ADMIN_EMAIL: z
    .string()
    .email()
    .optional(),

  ADMIN_PASSWORD: z
    .string()
    .min(8)
    .optional(),

  ADMIN_NAME: z
    .string()
    .optional()
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;