import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 orders per minute
  skipSuccessfulRequests: true,
});

export const reportIncidentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 incident reports per minute
  skipSuccessfulRequests: true,
});
