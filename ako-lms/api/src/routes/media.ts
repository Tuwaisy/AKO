import { Router } from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireRole } from '../middleware/auth';
import { logger, logAudit } from '../utils/logger';
import { config } from '../config/environment';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure S3 client
const s3Client = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = config.ALLOWED_FILE_TYPES;
    if (allowedTypes.length === 0 || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// Get signed URL for direct upload
router.post('/sign', requireRole(['INSTRUCTOR', 'ADMIN']), [
  body('fileName').notEmpty(),
  body('fileType').notEmpty(),
  body('fileSize').isInt({ min: 1 }),
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { fileName, fileType, fileSize } = req.body;

    // Check file size
    if (fileSize > config.MAX_FILE_SIZE_MB * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit of ${config.MAX_FILE_SIZE_MB}MB`,
      });
    }

    // Check file type
    if (config.ALLOWED_FILE_TYPES.length > 0 && !config.ALLOWED_FILE_TYPES.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: `File type ${fileType} is not allowed`,
      });
    }

    // Generate unique key
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const key = `uploads/${req.user.id}/${uniqueFileName}`;

    // Generate signed URL for upload
    const command = new PutObjectCommand({
      Bucket: config.S3_BUCKET_UPLOADS,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    res.json({
      success: true,
      data: {
        signedUrl,
        key,
        fileName: uniqueFileName,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    logger.error('Sign URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate signed URL',
    });
  }
});

// Upload file directly (alternative to signed URL)
router.post('/upload', requireRole(['INSTRUCTOR', 'ADMIN']), upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const key = `uploads/${req.user.id}/${uniqueFileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.S3_BUCKET_UPLOADS,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const fileUrl = `${config.CDN_PUBLIC_BASE_URL}/${config.S3_BUCKET_UPLOADS}/${key}`;

    res.json({
      success: true,
      data: {
        key,
        url: fileUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    });
  }
});

// Attach uploaded media to a lesson
router.post('/lessons/:id/media', requireRole(['INSTRUCTOR', 'ADMIN']), [
  param('id').isUUID(),
  body('url').isURL(),
  body('originalName').optional().isString(),
  body('mimeType').optional().isString(),
  body('size').optional().isInt({ min: 1 }),
  body('duration').optional().isFloat({ min: 0 }),
], async (req: any, res: any) => {
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
    const { url, originalName, mimeType, size, duration } = req.body;
    const prisma: PrismaClient = req.prisma;

    // Check if lesson exists and user has permission
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            course: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
      });
    }

    if (req.user.role !== 'ADMIN' && lesson.section.course.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Create media asset
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        lessonId: id,
        url,
        originalName,
        mimeType,
        size,
        duration,
      },
    });

    logAudit('attach_media', req.user.id, 'media_asset', {
      mediaAssetId: mediaAsset.id,
      lessonId: id,
      url,
    });

    res.status(201).json({
      success: true,
      data: mediaAsset,
    });
  } catch (error) {
    logger.error('Attach media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to attach media',
    });
  }
});

// Get media asset with signed URL
router.get('/assets/:id', [
  param('id').isUUID(),
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid media asset ID',
      });
    }

    const { id } = req.params;
    const prisma: PrismaClient = req.prisma;

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  select: {
                    id: true,
                    state: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
        captions: true,
      },
    });

    if (!mediaAsset) {
      return res.status(404).json({
        success: false,
        error: 'Media asset not found',
      });
    }

    // Check access permissions
    const canAccess = 
      req.user.role === 'ADMIN' ||
      mediaAsset.lesson.section.course.ownerId === req.user.id ||
      (mediaAsset.lesson.section.course.state === 'PUBLISHED' && ['STUDENT', 'PARENT', 'ASSISTANT'].includes(req.user.role));

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Generate signed URL for secure access
    let signedUrl = mediaAsset.url;
    
    if (mediaAsset.url.includes(config.S3_BUCKET_UPLOADS)) {
      try {
        const key = mediaAsset.url.split(`/${config.S3_BUCKET_UPLOADS}/`)[1];
        const command = new GetObjectCommand({
          Bucket: config.S3_BUCKET_UPLOADS,
          Key: key,
        });
        signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } catch (error) {
        logger.warn('Failed to generate signed URL, using original URL:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...mediaAsset,
        signedUrl,
      },
    });
  } catch (error) {
    logger.error('Get media asset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch media asset',
    });
  }
});

// Add captions to media asset
router.post('/assets/:id/captions', requireRole(['INSTRUCTOR', 'ADMIN']), [
  param('id').isUUID(),
  body('language').isLength({ min: 2, max: 5 }),
  body('label').notEmpty(),
  body('url').isURL(),
  body('isDefault').optional().isBoolean(),
], async (req: any, res: any) => {
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
    const { language, label, url, isDefault = false } = req.body;
    const prisma: PrismaClient = req.prisma;

    // Check if media asset exists and user has permission
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  select: { ownerId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!mediaAsset) {
      return res.status(404).json({
        success: false,
        error: 'Media asset not found',
      });
    }

    if (req.user.role !== 'ADMIN' && mediaAsset.lesson.section.course.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // If this is set as default, update existing captions
    if (isDefault) {
      await prisma.caption.updateMany({
        where: { mediaAssetId: id },
        data: { isDefault: false },
      });
    }

    const caption = await prisma.caption.create({
      data: {
        mediaAssetId: id,
        language,
        label,
        url,
        isDefault,
      },
    });

    res.status(201).json({
      success: true,
      data: caption,
    });
  } catch (error) {
    logger.error('Add captions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add captions',
    });
  }
});

export default router;
