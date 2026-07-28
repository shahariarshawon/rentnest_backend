import { PropertyStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../common/errors/AppError.js";

export async function getAllCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          properties: {
            where: { isDeleted: false, status: PropertyStatus.AVAILABLE }
          }
        }
      }
    }
  });

  return categories;
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          properties: {
            where: { isDeleted: false }
          }
        }
      }
    }
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
}

export async function createCategory(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  const existingCategory = await prisma.category.findFirst({
    where: {
      OR: [{ name }, { slug }]
    }
  });

  if (existingCategory) {
    throw new AppError("Category with this name already exists", 409);
  }

  const category = await prisma.category.create({
    data: { name, slug }
  });

  return category;
}

export async function updateCategory(id: string, name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  const existingCategory = await prisma.category.findUnique({
    where: { id }
  });

  if (!existingCategory) {
    throw new AppError("Category not found", 404);
  }

  const conflict = await prisma.category.findFirst({
    where: {
      AND: [{ NOT: { id } }, { OR: [{ name }, { slug }] }]
    }
  });

  if (conflict) {
    throw new AppError("Category with this name already exists", 409);
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: { name, slug }
  });

  return updatedCategory;
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { properties: true }
      }
    }
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (category._count.properties > 0) {
    throw new AppError("Cannot delete category associated with active properties", 400);
  }

  await prisma.category.delete({
    where: { id }
  });

  return { message: "Category deleted successfully" };
}
