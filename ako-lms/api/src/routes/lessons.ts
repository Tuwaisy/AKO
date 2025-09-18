import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import authMiddleware from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createLessonSchema = z.object({
  sectionId: z.string().uuid(),
  type: z.enum(['VIDEO', 'FILE', 'QUIZ']),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  order: z.number().int().min(0),
  unlockAt: z.string().datetime().optional(),
  requiresPrevCompletion: z.boolean().optional(),
  requiresQuizPass: z.boolean().optional()
});

const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  unlockAt: z.string().datetime().optional(),
  requiresPrevCompletion: z.boolean().optional(),
  requiresQuizPass: z.boolean().optional()
});

const viewEventSchema = z.object({
  eventType: z.enum(['PLAY', 'PAUSE', 'SEEK', 'SPEED', 'COMPLETE']),
  position: z.number().min(0),
  speed: z.number().min(0.1).max(4.0).optional(),
  watchTime: z.number().min(0).optional()
});

// Get lessons for a section
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sectionId } = req.query;

    if (!sectionId) {
      return res.status(400).json({ error: 'sectionId is required' });
    }

    // Check if section exists and user has access
    const section = await prisma.section.findUnique({
      where: { id: sectionId as string },
      include: {
        course: {
          select: { 
            id: true, 
            ownerId: true, 
            state: true 
          }
        }
      }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Check access permissions
    const canAccess = req.user?.role === 'ADMIN' ||
                     req.user?.id === section.course.ownerId ||
                     (section.course.state === 'PUBLISHED' && ['STUDENT', 'PARENT'].includes(req.user?.role || ''));    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const lessons = await prisma.lesson.findMany({
      where: { sectionId: sectionId as string },
      include: {
        mediaAssets: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            duration: true,
            url: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get lesson by ID
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                ownerId: true,
                state: true
              }
            }
          }
        },
        mediaAssets: {
          include: {
            captions: true
          }
        },
        viewEvents: req.user?.role === 'STUDENT' ? {
          where: { userId: req.user.id },
          orderBy: { timestamp: 'desc' },
          take: 1
        } : false
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Check access permissions
    const canAccess = req.user?.role === 'ADMIN' ||
                     req.user?.id === lesson.section.course.ownerId ||
                     (lesson.section.course.state === 'PUBLISHED' && ['STUDENT', 'PARENT'].includes(req.user?.role || ''));

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if lesson is unlocked for students
    if (req.user?.role === 'STUDENT' && lesson.unlockAt && lesson.unlockAt > new Date()) {
      return res.status(423).json({ 
        error: 'Lesson is not yet available', 
        unlockDate: lesson.unlockAt 
      });
    }

    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Create lesson
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only instructors and admins can create lessons
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validatedData = createLessonSchema.parse(req.body);
    const { sectionId, type, title, description, order, unlockAt, requiresPrevCompletion, requiresQuizPass } = validatedData;

    // Check if section exists and user has permission
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        course: {
          select: { id: true, title: true, ownerId: true }
        }
      }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Instructors can only create lessons in their own courses
    if (req.user?.role === 'INSTRUCTOR' && section.course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only create lessons in your own courses' });
    }

    const lesson = await prisma.lesson.create({
      data: {
        sectionId,
        type,
        title,
        description,
        order,
        unlockAt: unlockAt ? new Date(unlockAt) : null,
        requiresPrevCompletion: requiresPrevCompletion || false,
        requiresQuizPass: requiresQuizPass || false
      },
      include: {
        section: {
          include: {
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        mediaAssets: true
      }
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_LESSON',
        actorId: req.user!.id,
        target: `Lesson: ${title}`,
        metadata: {
          lessonId: lesson.id,
          sectionId,
          title,
          type,
          createdBy: req.user!.email
        }
      }
    });

    res.status(201).json(lesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});



// Update lesson
router.patch('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only instructors and admins can update lessons
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const validatedData = updateLessonSchema.parse(req.body);

    // Check if lesson exists and user has permission
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            course: {
              select: { id: true, ownerId: true }
            }
          }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Instructors can only update lessons in their own courses
    if (req.user?.role === 'INSTRUCTOR' && lesson.section.course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update lessons in your own courses' });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...validatedData,
        unlockAt: validatedData.unlockAt ? new Date(validatedData.unlockAt) : undefined
      },
      include: {
        section: {
          include: {
            course: {
              select: { id: true, title: true }
            }
          }
        },
        mediaAssets: true
      }
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_LESSON',
        actorId: req.user!.id,
        target: `Lesson: ${id}`,
        metadata: {
          lessonId: id,
          updates: validatedData,
          updatedBy: req.user!.email
        }
      }
    });

    res.json(updatedLesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// Delete lesson
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only instructors and admins can delete lessons
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;

    // Check if lesson exists and user has permission
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            course: {
              select: { id: true, ownerId: true }
            }
          }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Instructors can only delete lessons from their own courses
    if (req.user?.role === 'INSTRUCTOR' && lesson.section.course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete lessons from your own courses' });
    }

    await prisma.lesson.delete({
      where: { id }
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_LESSON',
        actorId: req.user!.id,
        target: `Lesson: ${lesson.title}`,
        metadata: {
          lessonId: id,
          title: lesson.title,
          deletedBy: req.user!.email
        }
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// Record lesson view event
router.post('/:id/view-event', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = viewEventSchema.parse(req.body);
    const { eventType, position, speed, watchTime } = validatedData;

    // Check if lesson exists and user has access
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            course: {
              select: { state: true }
            }
          }
        }
      }
    });

    if (!lesson || lesson.section.course.state !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Lesson not found or not available' });
    }

    // Create viewing event
    const viewingEvent = await prisma.viewEvent.create({
      data: {
        userId: req.user!.id,
        lessonId: id,
        eventType,
        position,
        speed: speed || 1.0
      }
    });

    // Update lesson attendance if this is a completion event
    if (eventType === 'COMPLETE') {
      await prisma.attendance.upsert({
        where: {
          userId_lessonId_type: {
            userId: req.user!.id,
            lessonId: id,
            type: 'CONTENT'
          }
        },
        update: {
          value: 1.0 // 100% watched
        },
        create: {
          userId: req.user!.id,
          lessonId: id,
          type: 'CONTENT',
          value: 1.0 // 100% watched
        }
      });
    }

    res.status(201).json(viewingEvent);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error recording view event:', error);
    res.status(500).json({ error: 'Failed to record view event' });
  }
});

export default router;