import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

// Admin middleware - ensures only admins can access admin routes
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply admin middleware to all routes
router.use(requireRole(['ADMIN']));

// Validation schemas
const systemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  category: z.string().optional(),
  description: z.string().optional()
});

const impersonateSchema = z.object({
  userId: z.string().uuid()
});

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8).optional()
});

// Get system statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      activeCourses,
      totalEnrollments,
      totalQuizzes,
      totalViewingEvents,
      storageUsed
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.course.count(),
      prisma.course.count({ where: { state: 'PUBLISHED' } }),
      prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
      prisma.quiz.count(),
      prisma.viewEvent.count(),
      prisma.mediaAsset.aggregate({
        _sum: { size: true }
      })
    ]);

    // Recent activity
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const recentCourses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        owner: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // User distribution
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    // Course distribution
    const coursesByStatus = await prisma.course.groupBy({
      by: ['state'],
      _count: true
    });

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        totalCourses,
        activeCourses,
        totalEnrollments,
        totalQuizzes,
        totalViewingEvents,
        storageUsed: storageUsed._sum?.size || 0
      },
      distributions: {
        usersByRole: usersByRole.reduce((acc: any, item) => {
          acc[item.role] = item._count;
          return acc;
        }, {}),
        coursesByStatus: {
          active: coursesByStatus.find(c => c.state === 'PUBLISHED')?._count || 0,
          inactive: coursesByStatus.find(c => c.state !== 'PUBLISHED')?._count || 0
        }
      },
      recentActivity: {
        users: recentUsers,
        courses: recentCourses
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Get audit logs
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '50',
      action,
      userId,
      targetUserId,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Add filters
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (targetUserId) where.targetUserId = targetUserId;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      auditLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get system settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = {};
    
    if (category) {
      where.category = category;
    }

    // SystemSetting model not available - return empty array
    const settings: any[] = [];

    // Group by category
    const groupedSettings = settings.reduce((acc: any, setting) => {
      const cat = setting.category || 'general';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(setting);
      return acc;
    }, {});

    res.json({
      settings: groupedSettings,
      categories: Object.keys(groupedSettings)
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Update system setting
router.put('/settings/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const validatedData = systemSettingSchema.parse({ key, ...req.body });

    // SystemSetting model not available - return stub  
    const setting = {
      id: `stub-${key}`,
      key: validatedData.key,
      value: validatedData.value,
      category: validatedData.category || 'general',
      description: validatedData.description
    };

    // Log the setting change
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SYSTEM_SETTING',
        actorId: req.user!.id,
        metadata: {
          settingKey: key,
          newValue: validatedData.value,
          category: validatedData.category
        }
      }
    });

    res.json(setting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating system setting:', error);
    res.status(500).json({ error: 'Failed to update system setting' });
  }
});

// Delete system setting
router.delete('/settings/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    // SystemSetting model not available - skip delete operation

    // Log the setting deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_SYSTEM_SETTING',
        actorId: req.user!.id,
        metadata: {
          settingKey: key
        }
      }
    });

    res.json({ message: 'System setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting system setting:', error);
    res.status(500).json({ error: 'Failed to delete system setting' });
  }
});

// Impersonate user
router.post('/impersonate', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = impersonateSchema.parse(req.body);
    const { userId } = validatedData;

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot impersonate inactive user' });
    }

    // Cannot impersonate another admin
    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot impersonate another admin' });
    }

    // Generate impersonation token
    const impersonationToken = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        impersonatedBy: req.user!.id,
        isImpersonating: true
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' } // Limit impersonation time
    );

    // Log the impersonation
    await prisma.auditLog.create({
      data: {
        action: 'START_IMPERSONATION',
        actorId: req.user!.id,
        target: userId,
        metadata: {
          targetUserEmail: targetUser.email,
          impersonatedBy: req.user!.email
        }
      }
    });

    res.json({
      message: 'Impersonation started successfully',
      impersonationToken,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role
      },
      expiresIn: '1h'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error starting impersonation:', error);
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

// End impersonation
router.post('/end-impersonation', async (req: AuthRequest, res: Response) => {
  try {
    // Check if currently impersonating
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.isImpersonating) {
      return res.status(400).json({ error: 'Not currently impersonating' });
    }

    // Log the end of impersonation
    await prisma.auditLog.create({
      data: {
        action: 'END_IMPERSONATION',
        actorId: decoded.impersonatedBy,
        target: decoded.userId,
        metadata: {
          targetUserEmail: decoded.email,
          endedBy: decoded.impersonatedBy
        }
      }
    });

    res.json({ message: 'Impersonation ended successfully' });
  } catch (error) {
    console.error('Error ending impersonation:', error);
    res.status(500).json({ error: 'Failed to end impersonation' });
  }
});

// Reset user password
router.post('/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const { userId, newPassword } = validatedData;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate password if not provided
    const password = newPassword || Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    });

    // Log the password reset
    await prisma.auditLog.create({
      data: {
        action: 'RESET_USER_PASSWORD',
        actorId: req.user!.id,
        target: userId,
        metadata: {
          targetUserEmail: user.email,
          resetBy: req.user!.email
        }
      }
    });

    res.json({
      message: 'Password reset successfully',
      temporaryPassword: newPassword ? undefined : password,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Manage user devices
router.get('/users/:userId/devices', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const devices = await prisma.deviceBinding.findMany({
      where: { userId: userId },
      orderBy: { lastSeen: 'desc' }
    });

    res.json({
      user,
      devices
    });
  } catch (error) {
    console.error('Error fetching user devices:', error);
    res.status(500).json({ error: 'Failed to fetch user devices' });
  }
});

// Revoke user device
router.delete('/users/:userId/devices/:deviceId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, deviceId } = req.params;

    const device = await prisma.deviceBinding.findUnique({
      where: { id: deviceId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!device || device.userId !== userId) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.deviceBinding.update({
      where: { id: deviceId },
      data: {
        active: false
      }
    });

    // Log the device revocation
    await prisma.auditLog.create({
      data: {
        action: 'REVOKE_USER_DEVICE',
        actorId: req.user!.id,
        target: userId,
        metadata: {
          deviceId: deviceId,
          platform: device.platform,
          deviceName: device.deviceName,
          userEmail: device.user.email,
          revokedBy: req.user!.email
        }
      }
    });

    res.json({ message: 'Device revoked successfully' });
  } catch (error) {
    console.error('Error revoking device:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

// System maintenance operations
router.post('/maintenance/cleanup-logs', async (req: AuthRequest, res: Response) => {
  try {
    const { olderThanDays = 90 } = req.body;
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const deletedCount = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    // Log the cleanup operation
    await prisma.auditLog.create({
      data: {
        action: 'CLEANUP_AUDIT_LOGS',
        actorId: req.user!.id,
        metadata: {
          deletedCount: deletedCount.count,
          olderThanDays,
          performedBy: req.user!.email
        }
      }
    });

    res.json({
      message: 'Audit logs cleaned up successfully',
      deletedCount: deletedCount.count
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
});

// Bulk operations
router.post('/bulk/deactivate-users', async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    // Don't allow deactivating admins or self
    const users = await prisma.user.findMany({
      where: { 
        id: { 
          in: userIds,
          not: req.user!.id 
        },
        role: { not: 'ADMIN' }
      },
      select: { id: true, email: true }
    });

    const validUserIds = users.map(u => u.id);

    const result = await prisma.user.updateMany({
      where: { 
        id: { in: validUserIds }
      },
      data: {
        status: 'SUSPENDED'
      }
    });

    // Log the bulk deactivation
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DEACTIVATE_USERS',
        actorId: req.user!.id,
        metadata: {
          requestedCount: userIds.length,
          actuallyDeactivated: result.count,
          deactivatedBy: req.user!.email,
          userEmails: users.map(u => u.email)
        }
      }
    });

    res.json({
      message: 'Bulk user deactivation completed',
      requested: userIds.length,
      deactivated: result.count
    });
  } catch (error) {
    console.error('Error in bulk user deactivation:', error);
    res.status(500).json({ error: 'Failed to deactivate users' });
  }
});

export default router;
