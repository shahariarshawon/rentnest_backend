import { z } from "zod";
import { Role, UserStatus } from "../../generated/prisma/client.js";

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID format")
  }),
  body: z.object({
    status: z.enum([UserStatus.ACTIVE, UserStatus.BANNED], { message: "Status must be ACTIVE or BANNED" })
  })
});

export const queryAdminUsersSchema = z.object({
  query: z.object({
    role: z.enum([Role.TENANT, Role.LANDLORD, Role.ADMIN]).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.BANNED]).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
  })
});

export const queryAdminPropertiesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    isDeleted: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
  })
});

export const queryAdminRentalsSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
  })
});
