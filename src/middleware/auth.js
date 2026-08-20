import { verifyToken } from '../utils/jwt.js';
import { getUserById, getUserRoles, getUserCommunityRole } from '../utils/db.js';
import logger from '../utils/logger.js';

export async function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided' },
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired token' },
      });
    }

    // Fetch full user data
    const user = await getUserById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found or inactive' },
      });
    }

    // Fetch user roles
    const roles = await getUserRoles(decoded.userId);

    // Attach to request
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      roles: roles.map(r => ({
        role: r.role,
        community_id: r.community_id,
      })),
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' },
        });
      }

      const userHasRole = req.user.roles.some(r => allowedRoles.includes(r.role));

      if (!userHasRole) {
        return res.status(403).json({
          success: false,
          error: { message: 'Insufficient permissions' },
        });
      }

      next();
    } catch (error) {
      logger.error('Role check middleware error:', error.message);
      return res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  };
}

export function requireCommunityAccess(req, res, next) {
  try {
    const communityId = req.params.communityId || req.body.community_id;

    if (!communityId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Community ID is required' },
      });
    }

    const hasAccess =
      req.user.roles.some(r => r.role === 'admin') ||
      req.user.roles.some(r => r.community_id === communityId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { message: 'No access to this community' },
      });
    }

    req.communityId = communityId;
    next();
  } catch (error) {
    logger.error('Community access middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
}

export async function requireManagerRole(req, res, next) {
  try {
    const communityId = req.params.communityId || req.body.community_id;

    if (!communityId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Community ID is required' },
      });
    }

    // Admin can do anything
    if (req.user.roles.some(r => r.role === 'admin')) {
      req.communityId = communityId;
      return next();
    }

    // Manager must have manager role in this specific community
    const isManager = req.user.roles.some(
      r => r.role === 'manager' && r.community_id === communityId
    );

    if (!isManager) {
      return res.status(403).json({
        success: false,
        error: { message: 'Manager access required for this community' },
      });
    }

    req.communityId = communityId;
    next();
  } catch (error) {
    logger.error('Manager role middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
}

export async function requireResidentRole(req, res, next) {
  try {
    const communityId = req.params.communityId || req.body.community_id;

    if (!communityId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Community ID is required' },
      });
    }

    // Admin can do anything
    if (req.user.roles.some(r => r.role === 'admin')) {
      req.communityId = communityId;
      return next();
    }

    // Resident must have resident role in this community
    const isResident = req.user.roles.some(
      r => r.role === 'resident' && r.community_id === communityId
    );

    if (!isResident) {
      return res.status(403).json({
        success: false,
        error: { message: 'Resident access required' },
      });
    }

    req.communityId = communityId;
    next();
  } catch (error) {
    logger.error('Resident role middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
}

export async function requireProviderRole(req, res, next) {
  try {
    const communityId = req.params.communityId || req.body.community_id;

    if (!communityId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Community ID is required' },
      });
    }

    // Admin can do anything
    if (req.user.roles.some(r => r.role === 'admin')) {
      req.communityId = communityId;
      return next();
    }

    // Provider must have provider role in this community
    const isProvider = req.user.roles.some(
      r => r.role === 'provider' && r.community_id === communityId
    );

    if (!isProvider) {
      return res.status(403).json({
        success: false,
        error: { message: 'Provider access required' },
      });
    }

    req.communityId = communityId;
    next();
  } catch (error) {
    logger.error('Provider role middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
}

function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}
