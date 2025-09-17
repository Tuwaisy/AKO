import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { PrismaClient, UserRole } from '@prisma/client';
import { config } from '../config/environment';
import { logger, logAudit } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { email, password, mfaCode, deviceInfo } = req.body;
    const prisma: PrismaClient = req.prisma;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        deviceBindings: {
          where: { active: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check MFA if enabled
    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaCode) {
        return res.status(200).json({
          success: true,
          requiresMfa: true,
          message: 'MFA code required',
        });
      }

      const isMfaValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaCode,
        window: 2, // Allow 2 time steps tolerance
      });

      if (!isMfaValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid MFA code',
        });
      }
    }

    // Handle device policy for students
    if (user.role === 'STUDENT') {
      const deviceLimit = config.FEATURE_DEVICE_LIMIT_PER_ROLE[user.role] || 1;
      const deviceHash = generateDeviceHash(deviceInfo || req.headers['user-agent']);

      // Check if this device is already bound
      const existingDevice = user.deviceBindings.find(d => d.deviceHash === deviceHash);

      if (!existingDevice && user.deviceBindings.length >= deviceLimit) {
        // Deactivate oldest device
        await prisma.deviceBinding.updateMany({
          where: {
            userId: user.id,
            active: true,
          },
          data: { active: false },
        });

        // Invalidate sessions for deactivated devices
        await prisma.session.deleteMany({
          where: { userId: user.id },
        });
      }

      // Create or update device binding
      await prisma.deviceBinding.upsert({
        where: {
          userId_deviceHash: {
            userId: user.id,
            deviceHash,
          },
        },
        update: {
          active: true,
          lastSeen: new Date(),
        },
        create: {
          userId: user.id,
          deviceHash,
          active: true,
          platform: detectPlatform(req.headers['user-agent']),
        },
      });
    }

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_SEC * 1000);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token: sessionId, // For now, session ID is the token
        validUntil: expiresAt,
      },
    });

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId,
      },
      config.JWT_SECRET,
      { expiresIn: config.ACCESS_TOKEN_TTL_SEC }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        sessionId,
      },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.REFRESH_TOKEN_TTL_SEC }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log audit
    logAudit('login', user.id, 'user', {
      email: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: config.ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        locale: user.locale,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: any, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any;
    const prisma: PrismaClient = req.prisma;

    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session || session.validUntil < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    if (session.user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended',
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id,
      },
      config.JWT_SECRET,
      { expiresIn: config.ACCESS_TOKEN_TTL_SEC }
    );

    res.json({
      success: true,
      accessToken,
      expiresIn: config.ACCESS_TOKEN_TTL_SEC,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req: any, res) => {
  try {
    const prisma: PrismaClient = req.prisma;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.decode(token) as any;
      
      if (decoded?.sessionId) {
        // Delete session
        await prisma.session.deleteMany({
          where: { id: decoded.sessionId },
        });
      }
    }

    // Log audit
    logAudit('logout', req.user.id, 'user', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

// Setup MFA
router.post('/mfa/setup', authMiddleware, async (req: any, res) => {
  try {
    const prisma: PrismaClient = req.prisma;
    const userId = req.user.id;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `AKO Courses (${req.user.email})`,
      issuer: 'AKO Courses',
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (not enabled until verified)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA setup failed',
    });
  }
});

// Verify and enable MFA
router.post('/mfa/enable', authMiddleware, [
  body('code').isLength({ min: 6, max: 6 }).isNumeric(),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA code format',
      });
    }

    const { code } = req.body;
    const prisma: PrismaClient = req.prisma;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.mfaSecret) {
      return res.status(400).json({
        success: false,
        error: 'MFA not set up. Call /mfa/setup first',
      });
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA code',
      });
    }

    // Enable MFA
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    // Log audit
    logAudit('mfa_enabled', userId, 'user');

    res.json({
      success: true,
      message: 'MFA enabled successfully',
    });
  } catch (error) {
    logger.error('MFA enable error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA enable failed',
    });
  }
});

// Disable MFA
router.post('/mfa/disable', authMiddleware, [
  body('password').notEmpty(),
  body('code').isLength({ min: 6, max: 6 }).isNumeric(),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { password, code } = req.body;
    const prisma: PrismaClient = req.prisma;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
      });
    }

    // Verify MFA code
    if (user.mfaSecret) {
      const isCodeValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (!isCodeValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid MFA code',
        });
      }
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // Log audit
    logAudit('mfa_disabled', userId, 'user');

    res.json({
      success: true,
      message: 'MFA disabled successfully',
    });
  } catch (error) {
    logger.error('MFA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA disable failed',
    });
  }
});

// Helper functions
function generateDeviceHash(userAgent: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(userAgent + Date.now()).digest('hex').substring(0, 32);
}

function detectPlatform(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    if (/iPhone|iPad/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    return 'mobile';
  }
  
  return 'web';
}

function generateSessionId(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

export default router;
