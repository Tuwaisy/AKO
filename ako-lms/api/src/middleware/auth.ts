import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, UserRole } from '@prisma/client';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: User;
  prisma?: PrismaClient;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    // Get user from database
    const user = await req.prisma!.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        locale: true,
        timezone: true,
        mfaEnabled: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended',
      });
    }

    // Check if session is valid (if sessionId is provided)
    if (decoded.sessionId) {
      const session = await req.prisma!.session.findUnique({
        where: { id: decoded.sessionId },
      });

      if (!session || session.validUntil < new Date()) {
        return res.status(401).json({
          success: false,
          error: 'Session expired',
        });
      }

      // Update session last used
      await req.prisma!.session.update({
        where: { id: decoded.sessionId },
        data: { lastUsed: new Date() },
      });
    }

    // Attach user to request
    req.user = user as User;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

export const requireOwnership = (resourceIdParam = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const resourceId = req.params[resourceIdParam];
      
      // Admin can access anything
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Check ownership based on the route
      const path = req.route?.path || req.path;
      
      if (path.includes('/courses')) {
        const course = await req.prisma!.course.findUnique({
          where: { id: resourceId },
          select: { ownerId: true },
        });

        if (!course || course.ownerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }
      } else if (path.includes('/users')) {
        // Users can only access their own data (except admins)
        if (resourceId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Ownership middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization error',
      });
    }
  };
};

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for token in cookies (for web app)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

export default authMiddleware;
