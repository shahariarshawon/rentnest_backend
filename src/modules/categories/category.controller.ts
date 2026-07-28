import type { Request, Response } from "express";
import { sendSuccess } from "../../common/utils/response.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory
} from "./category.service.js";

export async function handleGetAllCategories(_req: Request, res: Response) {
  const categories = await getAllCategories();
  return sendSuccess(res, 200, "Categories retrieved successfully", categories);
}

export async function handleGetCategoryById(req: Request, res: Response) {
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const category = await getCategoryById(id);
  return sendSuccess(res, 200, "Category retrieved successfully", category);
}

export async function handleCreateCategory(_req: Request, res: Response) {
  const { name } = res.locals.validated.body;
  const category = await createCategory(name);
  return sendSuccess(res, 201, "Category created successfully", category);
}

export async function handleUpdateCategory(req: Request, res: Response) {
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const { name } = res.locals.validated.body;
  const category = await updateCategory(id, name);
  return sendSuccess(res, 200, "Category updated successfully", category);
}

export async function handleDeleteCategory(req: Request, res: Response) {
  const id = (res.locals.validated?.params?.id || req.params.id) as string;
  const result = await deleteCategory(id);
  return sendSuccess(res, 200, result.message);
}
