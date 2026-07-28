import type { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function getPaginationParams(
  req: Request,
  defaultLimit = 10,
  maxLimit = 100
): PaginationParams {
  const pageParam = Number(req.query.page);
  const limitParam = Number(req.query.limit);

  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  let limit = !isNaN(limitParam) && limitParam > 0 ? limitParam : defaultLimit;

  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit) || 1;

  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages
    }
  };
}
