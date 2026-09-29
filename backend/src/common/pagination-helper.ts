export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getPaginationParams = (page: number, limit: number) => {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
};

export const buildPaginationMeta = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / page);

  return { total, page, limit, totalPages };
};
