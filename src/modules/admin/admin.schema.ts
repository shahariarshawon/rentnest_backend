import { z } from "zod";
import {
  RentalStatus,
  Role,
  UserStatus
} from "../../generated/prisma/client.js";

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID format")
  }),
  body: z.object({
    status: z.enum([UserStatus.ACTIVE, UserStatus.BANNED], {
      message: "Status must be ACTIVE or BANNED"
    })
  })
});

export const queryAdminUsersSchema = z.object({
  query: z.object({
    role: z.enum([Role.TENANT, Role.LANDLORD, Role.ADMIN]).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.BANNED]).optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});

export const queryAdminPropertiesSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    isDeleted: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});

export const queryAdminRentalsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(RentalStatus).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});
