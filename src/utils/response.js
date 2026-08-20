import logger from './logger.js';

export function createError(statusCode, message, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

export function handleError(error, res, defaultStatusCode = 500) {
  const statusCode = error.statusCode || defaultStatusCode;
  const message = error.message || 'Internal Server Error';
  const details = error.details || null;

  logger.error({
    statusCode,
    message,
    details,
    stack: error.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details }),
    },
  });
}

export function sendSuccess(res, data, statusCode = 200, message = 'Success') {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendPaginatedSuccess(res, data, total, page, limit, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    message: 'Success',
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}
