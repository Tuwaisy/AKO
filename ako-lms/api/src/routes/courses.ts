import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient, CourseState, UserRole } from '@prisma/client';
import { requireRole } from '../middleware/auth';
import { logger, logAudit } from '../utils/logger';

interface AuthRequest extends Request {
  user?: any;
  prisma?: PrismaClient;
}

const router = Router();

// Get all courses (with filtering)
router.get('/', [
  query('state').optional().isIn(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']),
  query('ownerId').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { state, ownerId, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const prisma = req.prisma || new PrismaClient();

    // Build where clause
    const where: any = {};
    
    if (state) where.state = state;
    if (ownerId && (req.user.role === 'ADMIN' || req.user.id === ownerId)) {
      where.ownerId = ownerId;
    } else if (req.user.role === 'INSTRUCTOR') {
      where.ownerId = req.user.id;
    } else if (req.user.role === 'STUDENT') {
      // Students can only see published courses they're enrolled in
      where.state = 'PUBLISHED';
      where.enrollments = {
        some: {
          userId: req.user.id,
          status: 'ACTIVE',
        },
      };
    } else if (req.user.role === 'PARENT') {
      // Parents can see courses their children are enrolled in
      where.state = 'PUBLISHED';
      where.enrollments = {
        some: {
          user: {
            childLinks: {
              some: {
                parentId: req.user.id,
              },
            },
          },
          status: 'ACTIVE',
        },
      };
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          sections: {
            include: {
              lessons: {
                select: {
                  id: true,
                  type: true,
                },
              },
            },
          },
          enrollments: req.user.role === 'STUDENT' ? {
            where: { userId: req.user.id },
            select: { id: true, status: true, enrolledAt: true },
          } : false,
          _count: {
            select: {
              enrollments: true,
              sections: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses',
    });
  }
});

// Get single course
router.get('/:id', [
  param('id').isUUID(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID',
      });
    }

    const { id } = req.params;
    const prisma = req.prisma || new PrismaClient();

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sections: {
          include: {
            lessons: {
              include: {
                mediaAssets: req.user.role !== 'STUDENT',
                quiz: {
                  select: {
                    id: true,
                    timeLimit: true,
                    attempts: true,
                    passMark: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        enrollments: req.user.role === 'STUDENT' ? {
          where: { userId: req.user.id },
        } : undefined,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    // Check access permissions
    const canAccess = 
      req.user.role === 'ADMIN' ||
      course.ownerId === req.user.id ||
      (course.state === 'PUBLISHED' && ['STUDENT', 'PARENT', 'ASSISTANT'].includes(req.user.role));

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    logger.error('Get course error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course',
    });
  }
});

// Create course
router.post('/', requireRole(['INSTRUCTOR', 'ADMIN']), [
  body('title').notEmpty().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 2000 }),
  body('language').optional().isLength({ max: 10 }),
  body('state').optional().isIn(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { title, description, language = 'en', state = 'DRAFT' } = req.body;
    const prisma = req.prisma || new PrismaClient();

    const course = await prisma.course.create({
      data: {
        title,
        description,
        language,
        state: state as CourseState,
        ownerId: req.user.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            sections: true,
          },
        },
      },
    });

    logAudit('create_course', req.user.id, 'course', {
      courseId: course.id,
      title: course.title,
    });

    logger.info(`Course created: ${course.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    logger.error('Create course error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create course',
    });
  }
});

// Update course
router.patch('/:id', [
  param('id').isUUID(),
  body('title').optional().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 2000 }),
  body('state').optional().isIn(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']),
  body('language').optional().isLength({ max: 10 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const updateData = req.body;
    const prisma = req.prisma || new PrismaClient();

    // Check if course exists and user has permission
    const existingCourse = await prisma.course.findUnique({
      where: { id },
      select: { ownerId: true, title: true },
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    if (req.user.role !== 'ADMIN' && existingCourse.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            sections: true,
          },
        },
      },
    });

    logAudit('update_course', req.user.id, 'course', {
      courseId: course.id,
      changes: updateData,
    });

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    logger.error('Update course error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update course',
    });
  }
});

// Delete course
router.delete('/:id', requireRole(['INSTRUCTOR', 'ADMIN']), [
  param('id').isUUID(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID',
      });
    }

    const { id } = req.params;
    const prisma = req.prisma || new PrismaClient();

    // Check if course exists and user has permission
    const existingCourse = await prisma.course.findUnique({
      where: { id },
      select: { ownerId: true, title: true },
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    if (req.user.role !== 'ADMIN' && existingCourse.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await prisma.course.delete({
      where: { id },
    });

    logAudit('delete_course', req.user.id, 'course', {
      courseId: id,
      title: existingCourse.title,
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course',
    });
  }
});

// Enroll user in course
router.post('/:id/enroll', requireRole(['ASSISTANT', 'INSTRUCTOR', 'ADMIN']), [
  param('id').isUUID(),
  body('userId').isUUID(),
  body('cohortId').optional().isString(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { userId, cohortId } = req.body;
    const prisma = req.prisma || new PrismaClient();

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, title: true, state: true, ownerId: true },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    // Check permissions
    if (req.user.role === 'INSTRUCTOR' && course.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Can only enroll users in your own courses',
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_userId: {
          courseId: id,
          userId,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        error: 'User is already enrolled in this course',
      });
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        courseId: id,
        userId,
        cohortId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    logAudit('enroll_user', req.user.id, 'enrollment', {
      enrollmentId: enrollment.id,
      courseId: id,
      userId,
      courseTitle: course.title,
      userEmail: user.email,
    });

    res.status(201).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    logger.error('Enroll user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll user',
    });
  }
});

// Get course analytics
router.get('/:id/analytics', requireRole(['INSTRUCTOR', 'ADMIN']), [
  param('id').isUUID(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID',
      });
    }

    const { id } = req.params;
    const prisma = req.prisma || new PrismaClient();

    // Check if course exists and user has permission
    const course = await prisma.course.findUnique({
      where: { id },
      select: { ownerId: true, title: true },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    if (req.user.role !== 'ADMIN' && course.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get analytics data
    const [
      enrollmentStats,
      completionStats,
      viewingStats,
      quizStats,
    ] = await Promise.all([
      // Enrollment statistics
      prisma.enrollment.groupBy({
        by: ['status'],
        where: { courseId: id },
        _count: true,
      }),
      
      // Completion statistics
      prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_enrolled,
          COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
        FROM enrollments 
        WHERE course_id = ${id}
      `,
      
      // Viewing statistics
      prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT ve.user_id) as active_viewers,
          AVG(CASE WHEN ve.event_type = 'COMPLETE' THEN 1.0 ELSE 0.0 END) as avg_completion_rate
        FROM view_events ve
        JOIN lessons l ON ve.lesson_id = l.id
        JOIN sections s ON l.section_id = s.id
        WHERE s.course_id = ${id}
          AND ve.timestamp >= NOW() - INTERVAL '30 days'
      `,
      
      // Quiz statistics
      prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_attempts,
          AVG(score) as avg_score,
          COUNT(CASE WHEN passed = true THEN 1 END) as passed_attempts
        FROM attempts a
        JOIN quizzes q ON a.quiz_id = q.id
        JOIN lessons l ON q.lesson_id = l.id
        JOIN sections s ON l.section_id = s.id
        WHERE s.course_id = ${id}
      `,
    ]);

    res.json({
      success: true,
      data: {
        enrollments: enrollmentStats,
        completions: completionStats,
        viewing: viewingStats,
        quizzes: quizStats,
      },
    });
  } catch (error) {
    logger.error('Course analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

export default router;
