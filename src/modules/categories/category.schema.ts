import { z } from "zod";

const categoryName = z
  .string()
  .trim()
  .min(2, "Category name must be at least 2 characters")
  .max(80, "Category name cannot exceed 80 characters");

export const createCategorySchema = z.object({
  body: z.object({
    name: categoryName
  })
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: categoryName
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
