import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import enrollmentRoutes from './routes/enrollments';
import quizRoutes from './routes/quizzes';
import mediaRoutes from './routes/media';
import reportRoutes from './routes/reports';
import adminRoutes from './routes/admin';

class Server {
  private app: express.Application;
  private prisma: PrismaClient;
  private redisClient: any;

  constructor() {
    this.app = express();
    this.prisma = new PrismaClient({
      log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
    this.initializeRedis();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeRedis() {
    try {
      this.redisClient = createClient({
        url: config.REDIS_URL,
      });

      this.redisClient.on('error', (err: Error) => {
        logger.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
    }
  }

  private initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: config.HELMET_CSP_ENABLED,
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.CORS_ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-User-Agent'],
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Trust proxy if configured
    if (config.TRUST_PROXY) {
      this.app.set('trust proxy', 1);
    }

    // Add prisma and redis to req object
    this.app.use((req: any, res, next) => {
      req.prisma = this.prisma;
      req.redis = this.redisClient;
      next();
    });
  }

  private initializeRoutes() {
    // Health check
    this.app.get('/health', async (req: any, res) => {
      try {
        // Check database connection
        await req.prisma.$queryRaw`SELECT 1`;
        
        // Check Redis connection
        await req.redis.ping();

        res.status(200).json({
          status: 'OK',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.NODE_ENV,
          version: process.env.npm_package_version || '1.0.0',
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'ERROR',
          message: 'Service unavailable',
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', authMiddleware, userRoutes);
    this.app.use('/api/courses', authMiddleware, courseRoutes);
    this.app.use('/api/enrollments', authMiddleware, enrollmentRoutes);
    this.app.use('/api/quizzes', authMiddleware, quizRoutes);
    this.app.use('/api/media', authMiddleware, mediaRoutes);
    this.app.use('/api/reports', authMiddleware, reportRoutes);
    this.app.use('/api/admin', authMiddleware, adminRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
      });
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorHandler);
  }

  public async start() {
    try {
      // Test database connection
      await this.prisma.$connect();
      logger.info('Connected to PostgreSQL database');

      const PORT = config.PORT || 4000;
      this.app.listen(PORT, () => {
        logger.info(`🚀 AKO LMS API Server running on port ${PORT}`);
        logger.info(`📖 Environment: ${config.NODE_ENV}`);
        logger.info(`🔗 CORS Origins: ${config.CORS_ALLOWED_ORIGINS}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async shutdown() {
    logger.info('Shutting down server...');
    
    try {
      await this.prisma.$disconnect();
      await this.redisClient?.quit();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
    
    process.exit(0);
  }
}

// Create and start server
const server = new Server();

// Graceful shutdown
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default server;
