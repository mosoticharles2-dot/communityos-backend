import express from 'express';
import { AuthService } from '../services/auth.service.js';
import { authSchemas } from '../utils/validators.js';
import { validationMiddleware } from '../middleware/errorHandler.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendSuccess, handleError } from '../utils/response.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  validationMiddleware(authSchemas.register),
  async (req, res) => {
    try {
      const { email, password, full_name, phone, role } = req.body;

      const user = await AuthService.register(
        email,
        password,
        full_name,
        phone,
        role
      );

      sendSuccess(
        res,
        {
          user,
          message: 'Registration successful. Please login.',
        },
        201,
        'User registered successfully'
      );
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * POST /api/auth/login
 * Login a user
 */
router.post(
  '/login',
  authLimiter,
  validationMiddleware(authSchemas.login),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const { token, user } = await AuthService.login(email, password);

      // Set HTTP-only cookie (optional)
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(
        res,
        {
          token,
          user,
        },
        200,
        'Login successful'
      );
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout a user (invalidate token)
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Clear cookie
    res.clearCookie('token');

    sendSuccess(
      res,
      {},
      200,
      'Logout successful'
    );
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/auth/me
 * Get current user data
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await AuthService.getCurrentUser(req.user.id);
    sendSuccess(res, user);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
