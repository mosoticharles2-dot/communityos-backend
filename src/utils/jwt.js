import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import logger from './logger.js';

export function generateToken(payload, expiresIn = config.JWT_EXPIRES_IN) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    return null;
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}

export function refreshToken(payload) {
  return generateToken(payload, config.JWT_EXPIRES_IN);
}
