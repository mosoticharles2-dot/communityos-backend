import { extractIP } from '../utils/helpers.js';
import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const ip = extractIP(req);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip,
      user: req.user?.id || 'anonymous',
    });
  });

  next();
}
