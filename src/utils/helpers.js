export function parseQueryPagination(query) {
  const page = Math.max(1, parseInt(query.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20, 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildFilterQuery(filters, allowedFields) {
  const queryParts = [];

  for (const [key, value] of Object.entries(filters)) {
    if (allowedFields.includes(key) && value !== undefined && value !== null) {
      queryParts.push({ [key]: value });
    }
  }

  return queryParts;
}

export function extractIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-client-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
