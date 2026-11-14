
import type { RequestHandler } from "express";

import { prisma } from "../lib/prisma.js";

// ===========================
// GET ALL CATEGORIES
// ===========================

export const getCategories: RequestHandler = async (
  _req,
  res,
  next
) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            properties: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
