function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function buildOrderBy(query, allowedFields = []) {
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    return { createdAt: 'desc' };
  }

  return { [sortBy]: sortOrder };
}

function buildSearchFilter(query, searchFields = []) {
  if (!query.search || searchFields.length === 0) return {};

  return {
    OR: searchFields.map((field) => ({
      [field]: { contains: query.search },
    })),
  };
}

module.exports = {
  getPaginationParams,
  buildPaginationMeta,
  buildOrderBy,
  buildSearchFilter,
};
