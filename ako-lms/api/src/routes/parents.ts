import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const linkStudentSchema = z.object({
  studentId: z.string().uuid(),
});

/**
 * @route   GET /api/parents/:id/children
 * @desc    Get all children linked to a parent
 * @access  Parent (own children), Admin
 */
router.get('/:id/children', async (req: any, res) => {
  try {
    const parentId = req.params.id;
    const { user } = req;

    // Authorization check
    if (user.role !== 'ADMIN' && user.id !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify parent exists and has correct role
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    if (parent.role !== 'PARENT') {
      return res.status(400).json({ error: 'User is not a parent' });
    }

    // Get all children linked to this parent
    const parentLinks = await prisma.parentLink.findMany({
      where: { parentId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
            // Include enrollment and progress data
            enrollments: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    state: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const children = parentLinks.map(link => link.student);

    res.json({
      success: true,
      children,
      total: children.length,
    });
  } catch (error) {
    logger.error('Error fetching parent children:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

/**
 * @route   POST /api/parents/:id/children
 * @desc    Link a student to a parent
 * @access  Parent (own account), Assistant, Instructor, Admin
 */
router.post('/:id/children', requireRole(['PARENT', 'ASSISTANT', 'INSTRUCTOR', 'ADMIN']), async (req: any, res) => {
  try {
    const parentId = req.params.id;
    const { user } = req;

    // Validate request body
    const validatedData = linkStudentSchema.parse(req.body);
    const { studentId } = validatedData;

    // Authorization check - parent can only link to their own account
    if (user.role === 'PARENT' && user.id !== parentId) {
      return res.status(403).json({ error: 'Parents can only link students to their own account' });
    }

    // Verify parent exists and has correct role
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    if (parent.role !== 'PARENT') {
      return res.status(400).json({ error: 'User is not a parent' });
    }

    // Verify student exists and has correct role
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'STUDENT') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    // Check if link already exists
    const existingLink = await prisma.parentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    if (existingLink) {
      return res.status(409).json({ error: 'Parent-student link already exists' });
    }

    // Create the parent-student link
    const parentLink = await prisma.parentLink.create({
      data: {
        parentId,
        studentId,
      },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log the action (audit log implementation pending)
    logger.info(`Parent-student link created`, {
      actorId: user.id,
      parentId,
      studentId,
      parentEmail: parent.email,
      studentEmail: student.email,
    });

    logger.info(`Parent-student link created: ${parentId} -> ${studentId} by ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Student linked to parent successfully',
      link: parentLink,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
    }

    logger.error('Error linking student to parent:', error);
    res.status(500).json({ error: 'Failed to link student to parent' });
  }
});

/**
 * @route   DELETE /api/parents/:id/children/:studentId
 * @desc    Unlink a student from a parent
 * @access  Parent (own children), Assistant, Instructor, Admin
 */
router.delete('/:id/children/:studentId', requireRole(['PARENT', 'ASSISTANT', 'INSTRUCTOR', 'ADMIN']), async (req: any, res) => {
  try {
    const parentId = req.params.id;
    const studentId = req.params.studentId;
    const { user } = req;

    // Authorization check
    if (user.role === 'PARENT' && user.id !== parentId) {
      return res.status(403).json({ error: 'Parents can only unlink from their own account' });
    }

    // Find the parent-student link
    const parentLink = await prisma.parentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
      include: {
        parent: {
          select: {
            email: true,
          },
        },
        student: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!parentLink) {
      return res.status(404).json({ error: 'Parent-student link not found' });
    }

    // Delete the parent-student link
    await prisma.parentLink.delete({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    // Log the action (audit log implementation pending)
    logger.info(`Parent-student link removed`, {
      actorId: user.id,
      parentId,
      studentId,
      parentEmail: parentLink.parent.email,
      studentEmail: parentLink.student.email,
    });

    logger.info(`Parent-student link removed: ${parentId} -> ${studentId} by ${user.email}`);

    res.json({
      success: true,
      message: 'Student unlinked from parent successfully',
    });
  } catch (error) {
    logger.error('Error unlinking student from parent:', error);
    res.status(500).json({ error: 'Failed to unlink student from parent' });
  }
});

/**
 * @route   GET /api/parents/:id/progress
 * @desc    Get basic progress summary for all children of a parent
 * @access  Parent (own children), Assistant, Instructor, Admin
 */
router.get('/:id/progress', async (req: any, res) => {
  try {
    const parentId = req.params.id;
    const { user } = req;

    // Authorization check
    if (user.role !== 'ADMIN' && user.id !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all children with basic enrollment info
    const parentLinks = await prisma.parentLink.findMany({
      where: { parentId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            enrollments: {
              select: {
                id: true,
                status: true,
                enrolledAt: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                    state: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const progressSummary = parentLinks.map((link) => {
      const student = link.student;
      const totalEnrollments = student.enrollments.length;
      const completedCourses = student.enrollments.filter((e: any) => e.status === 'COMPLETED').length;
      
      return {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          status: student.status,
        },
        progress: {
          totalEnrollments,
          completedCourses,
          completionRate: totalEnrollments > 0 ? (completedCourses / totalEnrollments) * 100 : 0,
        },
        enrollments: student.enrollments,
      };
    });

    res.json({
      success: true,
      parent: {
        id: parentId,
      },
      children: progressSummary,
      summary: {
        totalChildren: progressSummary.length,
        averageCompletionRate: progressSummary.reduce((avg, child) => 
          avg + child.progress.completionRate, 0) / (progressSummary.length || 1),
      },
    });
  } catch (error) {
    logger.error('Error fetching parent progress summary:', error);
    res.status(500).json({ error: 'Failed to fetch progress summary' });
  }
});

export default router;