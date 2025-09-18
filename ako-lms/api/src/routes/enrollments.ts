import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: any;
}
import { z } from 'zod';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for CSV uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Validation schemas
const enrollUserSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid()
});

const bulkEnrollSchema = z.object({
  courseId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).optional(),
  emails: z.array(z.string().email()).optional()
});

// Get enrollments with filtering and pagination
router.get('/', requireRole(['STUDENT', 'PARENT', 'INSTRUCTOR', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      courseId, 
      userId,
      status = 'ACTIVE',
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Add filters
    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    // Non-admins can only see their own enrollments or courses they teach
    if (req.user?.role === 'STUDENT' || req.user?.role === 'PARENT') {
      if (req.user.role === 'STUDENT') {
        where.userId = req.user.id;
      } else if (req.user.role === 'PARENT') {
        // Parents can see their children's enrollments
        const parentLinks = await prisma.parentLink.findMany({
          where: { parentId: req.user.id },
          select: { studentId: true }
        });
        const children = parentLinks.map(link => ({ id: link.studentId }));
        where.userId = { in: children.map(child => child.id) };
      }
    } else if (req.user?.role === 'INSTRUCTOR') {
      // Instructors can see enrollments for courses they teach
      if (!courseId) {
        const instructorCourses = await prisma.course.findMany({
          where: { ownerId: req.user.id },
          select: { id: true }
        });
        where.courseId = { in: instructorCourses.map(course => course.id) };
      }
    }

    // Add search filter for user or course names
    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } }
            ]
          }
        },
        {
          course: {
            title: { contains: search as string, mode: 'insensitive' }
          }
        }
      ];
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      }),
      prisma.enrollment.count({ where })
    ]);

    res.json({
      enrollments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Get enrollment by ID
router.get('/:id', requireRole(['STUDENT', 'PARENT', 'INSTRUCTOR', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        course: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            sections: {
              include: {
                lessons: {
                  select: {
                    id: true,
                    title: true,
                    order: true
                  },
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        },

      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check permissions
    const canView = req.user?.role === 'ADMIN' || 
                   req.user?.id === enrollment.userId || 
                   req.user?.id === enrollment.course.owner.id ||
                   (req.user?.role === 'PARENT' && enrollment.user?.id && 
                    await prisma.parentLink.findFirst({ where: { studentId: enrollment.user.id, parentId: req.user.id } }));

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

// Enroll a user in a course
router.post('/', requireRole(['STUDENT', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins and instructors can enroll users
    if (!['ADMIN', 'INSTRUCTOR'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validatedData = enrollUserSchema.parse(req.body);
    const { userId, courseId } = validatedData;

    // Check if course exists and is active
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        id: true, 
        title: true, 
        state: true, 
        ownerId: true,
        _count: {
          select: { enrollments: { where: { status: 'ACTIVE' } } }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.state !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Course is not active' });
    }



    // Instructors can only enroll in their own courses
    if (req.user?.role === 'INSTRUCTOR' && course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only enroll users in your own courses' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'User account is not active' });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId
        }
      }
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'ACTIVE') {
        return res.status(400).json({ error: 'User is already enrolled in this course' });
      } else {
        // Reactivate if previously dropped
        const enrollment = await prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: 'ACTIVE',
            enrolledAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        });

        // Log the re-enrollment
        await prisma.auditLog.create({
          data: {
            action: 'REENROLL_USER',
            actorId: req.user!.id,
            target: userId,
            metadata: {
              courseId: courseId,
              courseTitle: course.title,
              enrolledBy: req.user!.email
            }
          }
        });

        return res.status(201).json(enrollment);
      }
    }

    // Create new enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ACTIVE',
        enrolledAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Log the enrollment
    await prisma.auditLog.create({
      data: {
        action: 'ENROLL_USER',
        actorId: req.user!.id,
        target: userId,
        metadata: {
          courseId: courseId,
          courseTitle: course.title,
          enrolledBy: req.user!.email
        }
      }
    });

    res.status(201).json(enrollment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// Bulk enrollment
router.post('/bulk', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins and instructors can bulk enroll
    if (!['ADMIN', 'INSTRUCTOR'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validatedData = bulkEnrollSchema.parse(req.body);
    const { courseId, userIds, emails } = validatedData;

    if (!userIds?.length && !emails?.length) {
      return res.status(400).json({ error: 'Either userIds or emails must be provided' });
    }

    // Check if course exists and is active
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        id: true, 
        title: true, 
        state: true, 
        ownerId: true
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.state !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Course is not active' });
    }

    // Instructors can only enroll in their own courses
    if (req.user?.role === 'INSTRUCTOR' && course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only enroll users in your own courses' });
    }

    // Get target users
    let targetUserIds = userIds || [];
    
    if (emails?.length) {
      const usersByEmail = await prisma.user.findMany({
        where: { 
          email: { in: emails },
          status: 'ACTIVE'
        },
        select: { id: true, email: true }
      });

      const foundEmails = usersByEmail.map(u => u.email);
      const notFoundEmails = emails.filter(email => !foundEmails.includes(email));
      
      if (notFoundEmails.length > 0) {
        return res.status(400).json({ 
          error: 'Some users not found', 
          notFoundEmails 
        });
      }

      targetUserIds = [...targetUserIds, ...usersByEmail.map(u => u.id)];
    }

    // Remove duplicates
    targetUserIds = [...new Set(targetUserIds)];



    // Get existing enrollments
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        userId: { in: targetUserIds }
      },
      select: { userId: true, status: true, id: true }
    });

    const existingActiveUserIds = existingEnrollments
      .filter(e => e.status === 'ACTIVE')
      .map(e => e.userId);

    const existingInactiveEnrollments = existingEnrollments
      .filter(e => e.status !== 'ACTIVE');

    const newUserIds = targetUserIds.filter(id => !existingEnrollments.some(e => e.userId === id));

    const results = {
      successful: [] as any[],
      alreadyEnrolled: existingActiveUserIds,
      reactivated: [] as any[],
      errors: [] as any[]
    };

    // Reactivate inactive enrollments
    if (existingInactiveEnrollments.length > 0) {
      await prisma.enrollment.updateMany({
        where: {
          id: { in: existingInactiveEnrollments.map(e => e.id) }
        },
        data: {
          status: 'ACTIVE',
          enrolledAt: new Date()
        }
      });

      results.reactivated = existingInactiveEnrollments.map(e => e.userId);
    }

    // Create new enrollments
    if (newUserIds.length > 0) {
      const newEnrollments = await prisma.enrollment.createMany({
        data: newUserIds.map(userId => ({
          userId,
          courseId,
          status: 'ACTIVE',
          enrolledAt: new Date()
        }))
      });

      results.successful = newUserIds;
    }

    // Log the bulk enrollment
    await prisma.auditLog.create({
      data: {
        action: 'BULK_ENROLL_USERS',
        actorId: req.user!.id,
        metadata: {
          courseId: courseId,
          courseTitle: course.title,
          totalUsers: targetUserIds.length,
          successful: results.successful.length,
          reactivated: results.reactivated.length,
          alreadyEnrolled: results.alreadyEnrolled.length,
          enrolledBy: req.user!.email
        }
      }
    });

    res.json({
      message: 'Bulk enrollment completed',
      results
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error in bulk enrollment:', error);
    res.status(500).json({ error: 'Failed to process bulk enrollment' });
  }
});

// Bulk enrollment via CSV
router.post('/bulk-csv', requireRole(['ADMIN']), upload.single('csvFile'), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins and instructors can bulk enroll
    if (!['ADMIN', 'INSTRUCTOR'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    // Check if course exists and is active
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        id: true, 
        title: true, 
        state: true, 
        ownerId: true
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.state !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Course is not active' });
    }

    // Instructors can only enroll in their own courses
    if (req.user?.role === 'INSTRUCTOR' && course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only enroll users in your own courses' });
    }

    // Parse CSV
    const csvData = await new Promise<any[]>((resolve, reject) => {
      const records: any[] = [];
      const stream = Readable.from(req.file!.buffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (data: any) => records.push(data))
        .on('end', () => resolve(records))
        .on('error', reject);
    });

    const results = {
      successful: [] as any[],
      errors: [] as any[]
    };

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row

      try {
        if (!row.email) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing email'
          });
          continue;
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: row.email },
          select: { id: true, firstName: true, lastName: true, email: true, status: true }
        });

        if (!user) {
          results.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'User not found'
          });
          continue;
        }

        if (user.status !== 'ACTIVE') {
          results.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'User account is not active'
          });
          continue;
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            courseId_userId: {
              courseId,
              userId: user.id
            }
          }
        });

        if (existingEnrollment?.status === 'ACTIVE') {
          results.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'User is already enrolled'
          });
          continue;
        }

        // Create or reactivate enrollment
        if (existingEnrollment && existingEnrollment.status === 'WITHDRAWN') {
          await prisma.enrollment.update({
            where: { id: existingEnrollment.id },
            data: {
              status: 'ACTIVE',
              enrolledAt: new Date()
            }
          });
        } else {
          await prisma.enrollment.create({
            data: {
              userId: user.id,
              courseId,
              status: 'ACTIVE',
              enrolledAt: new Date()
            }
          });
        }

        results.successful.push({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          action: existingEnrollment ? 'reactivated' : 'enrolled'
        });

      } catch (error) {
        results.errors.push({
          row: rowNumber,
          email: row.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log the CSV bulk enrollment
    await prisma.auditLog.create({
      data: {
        action: 'BULK_ENROLL_CSV',
        actorId: req.user!.id,
        metadata: {
          courseId: courseId,
          courseTitle: course.title,
          totalRows: csvData.length,
          successful: results.successful.length,
          errors: results.errors.length,
          enrolledBy: req.user!.email
        }
      }
    });

    res.json({
      message: 'CSV bulk enrollment completed',
      summary: {
        totalRows: csvData.length,
        successful: results.successful.length,
        errors: results.errors.length
      },
      results
    });

  } catch (error) {
    console.error('Error in CSV bulk enrollment:', error);
    res.status(500).json({ error: 'Failed to process CSV bulk enrollment' });
  }
});

// Drop enrollment (soft delete)
router.delete('/:id', requireRole(['STUDENT', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: {
          select: { ownerId: true, title: true }
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check permissions - users can drop themselves, instructors can drop from their courses, admins can drop anyone
    const canDrop = req.user?.role === 'ADMIN' || 
                   req.user?.id === enrollment.userId || 
                   (req.user?.role === 'INSTRUCTOR' && req.user.id === enrollment.course.ownerId);

    if (!canDrop) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update enrollment to dropped
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        status: 'WITHDRAWN'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Log the drop
    await prisma.auditLog.create({
      data: {
        action: 'DROP_ENROLLMENT',
        actorId: req.user!.id,
        target: enrollment.userId,
        metadata: {
          courseId: enrollment.courseId,
          courseTitle: 'Course ' + enrollment.courseId,
          droppedBy: req.user!.email
        }
      }
    });

    res.json({ message: 'Enrollment dropped successfully', enrollment: updatedEnrollment });
  } catch (error) {
    console.error('Error dropping enrollment:', error);
    res.status(500).json({ error: 'Failed to drop enrollment' });
  }
});

// Get enrollment CSV template
router.get('/csv-template', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins and instructors can download template
    if (!['ADMIN', 'INSTRUCTOR'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const csvContent = `email
student1@example.com
student2@example.com
student3@example.com`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=enrollment_template.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating enrollment CSV template:', error);
    res.status(500).json({ error: 'Failed to generate CSV template' });
  }
});

export default router;
