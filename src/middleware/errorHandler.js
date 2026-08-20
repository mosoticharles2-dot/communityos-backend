import { handleError } from '../utils/response.js';
import { validateSchema } from '../utils/validators.js';
import logger from '../utils/logger.js';

export function validationMiddleware(schema) {
  return (req, res, next) => {
    try {
      const data = req.body || {};
      const validated = validateSchema(schema, data);
      req.body = validated;
      next();
    } catch (error) {
      handleError(error, res);
    }
  };
}

export function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err.details && { details: err.details }),
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
    },
  });
}
