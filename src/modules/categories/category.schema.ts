import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, "Category name must be at least 2 characters")
  })
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, "Category name must be at least 2 characters")
  }),
  params: z.object({
    id: z.string().uuid("Invalid category ID format")
  })
});

export const getCategoryByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid category ID format")
  })
});
