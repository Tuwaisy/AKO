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
const createSectionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200),
  order: z.number().int().min(0)
});

const updateSectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional()
});

// Get sections for a course
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    // Check if course exists and user has access
    const course = await prisma.course.findUnique({
      where: { id: courseId as string },
      select: { 
        id: true, 
        title: true, 
        ownerId: true, 
        state: true 
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check access permissions
    const canAccess = req.user?.role === 'ADMIN' || 
                     req.user?.id === course.ownerId ||
                     (course.state === 'PUBLISHED' && ['STUDENT', 'PARENT'].includes(req.user?.role || ''));

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sections = await prisma.section.findMany({
      where: { courseId: courseId as string },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            type: true,
            order: true
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Create section
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only instructors and admins can create sections
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validatedData = createSectionSchema.parse(req.body);
    const { courseId, title, order } = validatedData;

    // Check if course exists and user has permission
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, ownerId: true }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Instructors can only create sections in their own courses
    if (req.user?.role === 'INSTRUCTOR' && course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only create sections in your own courses' });
    }

    const section = await prisma.section.create({
      data: {
        courseId,
        title,
        order
      },
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        },
        lessons: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_SECTION',
        actorId: req.user!.id,
        target: `Section: ${title}`,
        metadata: {
          sectionId: section.id,
          courseId,
          title,
          createdBy: req.user!.email
        }
      }
    });

    res.status(201).json(section);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Get section by ID
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            state: true
          }
        },
        lessons: {
          include: {
            mediaAssets: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                size: true,
                duration: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Check access permissions
    const canAccess = req.user?.role === 'ADMIN' ||
                     req.user?.id === section.course.ownerId ||
                     (section.course.state === 'PUBLISHED' && ['STUDENT', 'PARENT'].includes(req.user?.role || ''));

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

// Update section
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only instructors and admins can update sections
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validatedData = updateSectionSchema.parse(req.body);

    // Check if section exists and user has permission
    const existingSection = await prisma.section.findUnique({
      where: { id },
      include: {
        course: {
          select: { ownerId: true }
        }
      }
    });

    if (!existingSection) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Instructors can only update sections in their own courses
    if (req.user?.role === 'INSTRUCTOR' && existingSection.course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update sections in your own courses' });
    }

    const section = await prisma.section.update({
      where: { id },
      data: validatedData,
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        },
        lessons: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SECTION',
        actorId: req.user!.id,
        target: `Section: ${id}`,
        metadata: {
          sectionId: id,
          changes: validatedData,
          updatedBy: req.user!.email
        }
      }
    });

    res.json(section);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete section
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only instructors and admins can delete sections
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if section exists and user has permission
    const existingSection = await prisma.section.findUnique({
      where: { id },
      include: {
        course: {
          select: { ownerId: true }
        },
        lessons: {
          select: { id: true }
        }
      }
    });

    if (!existingSection) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Instructors can only delete sections in their own courses
    if (req.user?.role === 'INSTRUCTOR' && existingSection.course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete sections in your own courses' });
    }

    // Check if section has lessons
    if (existingSection.lessons.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete section that contains lessons. Please delete all lessons first.' 
      });
    }

    await prisma.section.delete({
      where: { id }
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_SECTION',
        actorId: req.user!.id,
        target: `Section: ${existingSection.title}`,
        metadata: {
          sectionId: id,
          title: existingSection.title,
          deletedBy: req.user!.email
        }
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

export default router;