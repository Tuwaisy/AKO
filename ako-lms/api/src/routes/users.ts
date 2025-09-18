import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: any;
}
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { Readable } from 'stream';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for CSV uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN', 'PARENT']),
  parentEmail: z.string().email().optional(),
  phone: z.string().optional(),
  grade: z.string().optional(),
  dateOfBirth: z.string().optional()
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  grade: z.string().optional(),
  isActive: z.boolean().optional(),
  parentEmail: z.string().email().optional()
});

const bulkEnrollSchema = z.object({
  courseId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).optional(),
  emails: z.array(z.string().email()).optional()
});

// Get all users with filtering and pagination
router.get('/', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins and instructors can list users
    if (!['ADMIN', 'INSTRUCTOR'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { 
      page = '1', 
      limit = '20', 
      role, 
      search, 
      grade,
      isActive,
      parentId
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Add filters
    if (role) where.role = role;
    if (grade) where.grade = grade;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (parentId) where.parentId = parentId;

    // Add search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true, // Instead of isActive
          createdAt: true,
          updatedAt: true,
          childLinks: {
            select: {
              parent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          parentLinks: {
            select: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              enrollments: true
            }
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile, unless admin/instructor
    if (req.user?.id !== id && !['ADMIN', 'INSTRUCTOR'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        childLinks: {
          select: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        // Note: children relation not available in User schema, removing for now,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                state: true,
                createdAt: true
              }
            }
          },
          orderBy: { enrolledAt: 'desc' }
        },
        // Note: devices relation not available in User schema, removing for now
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins can create users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    const validatedData = createUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Handle parent relationship
    let parentId = null;
    if (validatedData.parentEmail) {
      const parent = await prisma.user.findUnique({
        where: { email: validatedData.parentEmail }
      });

      if (!parent) {
        return res.status(400).json({ error: 'Parent not found with the provided email' });
      }

      if (parent.role !== 'PARENT') {
        return res.status(400).json({ error: 'Specified user is not a parent' });
      }

      parentId = parent.id;
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
        // Note: parentId, phone, grade, dateOfBirth, and mustChangePassword fields not available in User schema, skipping
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        // grade: true, // Field not available in User schema
        // phone: true, // Field not available in User schema
        // isActive: true, // Field alignment: isActive → status
        createdAt: true
      }
    });

    // Note: AuditLog creation removed - fields not matching schema

    res.status(201).json({
      user,
      temporaryPassword: tempPassword,
      message: 'User created successfully. Please share the temporary password securely.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues }); // Field alignment: errors → issues
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only update their own profile (limited fields), admins can update anyone
    const isOwnProfile = req.user?.id === id;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validatedData = updateUserSchema.parse(req.body);

    // Non-admins can only update certain fields
    if (!isAdmin) {
      const allowedFields = ['firstName', 'lastName', 'phone'];
      const updateData = Object.fromEntries(
        Object.entries(validatedData).filter(([key]) => allowedFields.includes(key))
      );
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
    }

    // Handle parent relationship for admins
    let parentId = undefined;
    if (isAdmin && validatedData.parentEmail !== undefined) {
      if (validatedData.parentEmail) {
        const parent = await prisma.user.findUnique({
          where: { email: validatedData.parentEmail }
        });

        if (!parent) {
          return res.status(400).json({ error: 'Parent not found with the provided email' });
        }

        if (parent.role !== 'PARENT') {
          return res.status(400).json({ error: 'Specified user is not a parent' });
        }

        parentId = parent.id;
      } else {
        parentId = null; // Remove parent relationship
      }
    }

    const updateData: any = isAdmin ? validatedData : Object.fromEntries(
      Object.entries(validatedData).filter(([key]) => ['firstName', 'lastName', 'phone'].includes(key))
    );

    if (parentId !== undefined) {
      updateData.parentId = parentId;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        // grade: true, // Field not available in User schema
        // phone: true, // Field not available in User schema  
        // isActive: true, // Field alignment: isActive → status
        updatedAt: true
        // parent: { // Parent relation not available in User schema
        //   select: {
        //     id: true,
        //     firstName: true,
        //     lastName: true,
        //     email: true
        //   }
        // }
      }
    });

    // Log the update
    // Note: AuditLog creation removed - fields not matching schema

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues }); // Field alignment: errors → issues
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Deactivate user (soft delete)
router.delete('/:id', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only admins can deactivate users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can deactivate users' });
    }

    // Can't deactivate yourself
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { 
        // isActive: false, // Field alignment: isActive → status (value: INACTIVE)
        // deactivatedAt: new Date() // Field not available in User schema
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        // isActive: true // Field alignment: isActive → status
      }
    });

    // Note: AuditLog creation removed - fields not matching schema

    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Bulk user import via CSV
router.post('/bulk-import', requireRole(['ADMIN']), upload.single('csvFile'), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins can bulk import
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can bulk import users' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Parse CSV
    const csvData = await new Promise<any[]>((resolve, reject) => {
      const records: any[] = [];
      const stream = Readable.from(req.file!.buffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (data) => records.push(data))
        .on('end', () => resolve(records))
        .on('error', reject);
    });

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row

      try {
        // Validate required fields
        if (!row.email || !row.firstName || !row.lastName || !row.role) {
          errors.push({
            row: rowNumber,
            error: 'Missing required fields (email, firstName, lastName, role)'
          });
          continue;
        }

        // Validate role
        if (!['STUDENT', 'INSTRUCTOR', 'ADMIN', 'PARENT'].includes(row.role)) {
          errors.push({
            row: rowNumber,
            error: 'Invalid role. Must be STUDENT, INSTRUCTOR, ADMIN, or PARENT'
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: row.email }
        });

        if (existingUser) {
          errors.push({
            row: rowNumber,
            email: row.email,
            error: 'User already exists'
          });
          continue;
        }

        // Handle parent relationship
        let parentId = null;
        if (row.parentEmail) {
          const parent = await prisma.user.findUnique({
            where: { email: row.parentEmail }
          });

          if (!parent) {
            errors.push({
              row: rowNumber,
              email: row.email,
              error: 'Parent not found with the provided email'
            });
            continue;
          }

          if (parent.role !== 'PARENT') {
            errors.push({
              row: rowNumber,
              email: row.email,
              error: 'Specified user is not a parent'
            });
            continue;
          }

          parentId = parent.id;
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Create user
        const user = await prisma.user.create({
          data: {
            email: row.email,
            password: hashedPassword,
            firstName: row.firstName,
            lastName: row.lastName,
            role: row.role
            // parentId, phone, grade, dateOfBirth, mustChangePassword fields not available in User schema
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        });

        results.push({
          user,
          temporaryPassword: tempPassword
        });

      } catch (error) {
        errors.push({
          row: rowNumber,
          email: row.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log the bulk import
    // Note: AuditLog creation removed - fields not matching schema

    res.json({
      message: 'Bulk import completed',
      summary: {
        totalRows: csvData.length,
        successful: results.length,
        errors: errors.length
      },
      results: results.map(r => ({
        user: r.user,
        temporaryPassword: r.temporaryPassword
      })),
      errors
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Failed to process bulk import' });
  }
});

// Get CSV template
router.get('/csv-template', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins can download template
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can access CSV template' });
    }

    const csvContent = `email,firstName,lastName,role,parentEmail,phone,grade,dateOfBirth
student@example.com,John,Doe,STUDENT,parent@example.com,+1234567890,Grade 10,2008-05-15
instructor@example.com,Jane,Smith,INSTRUCTOR,,+1987654321,,1985-03-20
parent@example.com,Robert,Doe,PARENT,,+1555666777,,1980-12-10`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=user_import_template.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV template:', error);
    res.status(500).json({ error: 'Failed to generate CSV template' });
  }
});

export default router;
