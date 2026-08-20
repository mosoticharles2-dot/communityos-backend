import express from 'express';
import { CommunityService } from '../services/community.service.js';
import { authMiddleware, requireManagerRole } from '../middleware/auth.js';
import { communitySchemas } from '../utils/validators.js';
import { validationMiddleware } from '../middleware/errorHandler.js';
import { sendSuccess, sendPaginatedSuccess, handleError } from '../utils/response.js';
import { parseQueryPagination } from '../utils/helpers.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authMiddleware);
router.use(apiLimiter);

/**
 * GET /api/communities/:communityId/pulse
 * Get Community Pulse (service status overview)
 */
router.get('/:communityId/pulse', async (req, res) => {
  try {
    const { communityId } = req.params;

    // Verify community exists and user has access
    const community = await CommunityService.getCommunityById(communityId);
    if (!community) {
      return res.status(404).json({
        success: false,
        error: { message: 'Community not found' },
      });
    }

    // Check if user has access to this community
    const hasAccess =
      req.user.roles.some(r => r.role === 'admin') ||
      req.user.roles.some(r => r.community_id === communityId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { message: 'No access to this community' },
      });
    }

    const pulse = await CommunityService.getCommunityPulse(communityId);
    sendSuccess(res, pulse, 200, 'Community Pulse retrieved');
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/communities/:communityId/residents
 * Get community residents (manager only)
 */
router.get(
  '/:communityId/residents',
  requireManagerRole,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const { page, limit, offset } = parseQueryPagination(req.query);

      const { data, total } = await CommunityService.getResidents(
        communityId,
        limit,
        offset
      );

      sendPaginatedSuccess(res, data, total, page, limit);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * GET /api/communities/:communityId
 * Get community details
 */
router.get('/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;

    // Check if user has access
    const hasAccess =
      req.user.roles.some(r => r.role === 'admin') ||
      req.user.roles.some(r => r.community_id === communityId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { message: 'No access to this community' },
      });
    }

    const community = await CommunityService.getCommunityById(communityId);
    if (!community) {
      return res.status(404).json({
        success: false,
        error: { message: 'Community not found' },
      });
    }

    sendSuccess(res, community);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/communities
 * Get all communities (admin only)
 */
router.get('/', async (req, res) => {
  try {
    // Check if user is admin
    const isAdmin = req.user.roles.some(r => r.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required' },
      });
    }

    const { page, limit, offset } = parseQueryPagination(req.query);
    const { data, total } = await CommunityService.getAllCommunities(limit, offset);

    sendPaginatedSuccess(res, data, total, page, limit);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
