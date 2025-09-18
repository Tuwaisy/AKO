import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import authMiddleware, { requireRole } from '../middleware/auth';
import { z } from 'zod';
import { logger, logAudit } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createQuizSchema = z.object({
  timeLimit: z.number().int().min(1).optional(),
  maxAttempts: z.number().int().min(1),
  passMark: z.number().min(0).max(100),
  shuffleQuestions: z.boolean().optional(),
  shuffleAnswers: z.boolean().optional(),
  showResults: z.boolean().optional()
});

const questionSchema = z.object({
  type: z.enum(['MCQ_SINGLE', 'MCQ_MULTI', 'ESSAY']),
  text: z.string().min(1),
  points: z.number().min(0).optional(),
  options: z.array(z.string()).optional(),
  answers: z.array(z.string()).optional(),
  category: z.string().optional(),
  mediaRef: z.string().optional()
});

const addQuestionsSchema = z.object({
  items: z.array(questionSchema).min(1)
});

const submitAnswersSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()]))
});

// Create or update quiz for a lesson
router.post('/lessons/:id/quiz', authMiddleware, requireRole(['INSTRUCTOR', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only instructors and admins can create quizzes
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const validatedData = createQuizSchema.parse(req.body);

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
        quiz: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Instructors can only create quizzes for their own courses
    if (req.user?.role === 'INSTRUCTOR' && lesson.section.course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only create quizzes for your own courses' });
    }

    // Create or update quiz
    const quiz = await prisma.quiz.upsert({
      where: { lessonId: id },
      update: {
        ...validatedData,
        timeLimit: validatedData.timeLimit || null,
      },
      create: {
        lessonId: id,
        ...validatedData,
        timeLimit: validatedData.timeLimit || null,
      },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Log the quiz creation/update
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_QUIZ',
        actorId: req.user!.id,
        metadata: {
          quizId: quiz.id,
          lessonId: id,
          createdBy: req.user!.email
        }
      }
    });

    res.status(201).json(quiz);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Add questions to quiz
router.post('/:id/questions', authMiddleware, requireRole(['INSTRUCTOR', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only instructors and admins can add questions
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const validatedData = addQuestionsSchema.parse(req.body);
    const { items } = validatedData;

    // Check if quiz exists and user has permission
    const quiz = await prisma.quiz.findUnique({
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

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Instructors can only add questions to their own courses
    if (req.user?.role === 'INSTRUCTOR' && quiz.lesson.section.course.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only add questions to your own courses' });
    }

    // Validate question data and prepare for creation
    const validatedQuestions = items.map((item) => {
      const question = {
        quizId: id,
        type: item.type,
        text: item.text,
        points: item.points || 1.0,
        options: item.options || [],
        answers: item.answers || [],
        category: item.category,
        mediaRef: item.mediaRef,
      };

      // Validate MCQ questions have options and answers
      if (question.type.startsWith('MCQ_') && (!question.options.length || !question.answers.length)) {
        throw new Error(`MCQ question "${question.text}" must have options and correct answers`);
      }

      return question;
    });

    // Create questions
    await prisma.question.createMany({
      data: validatedQuestions,
    });

    // Fetch created questions
    const createdQuestions = await prisma.question.findMany({
      where: { quizId: id },
      orderBy: { createdAt: 'desc' },
      take: items.length,
    });

    // Log the question addition
    await prisma.auditLog.create({
      data: {
        action: 'ADD_QUESTIONS',
        actorId: req.user!.id,
        metadata: {
          quizId: id,
          questionCount: items.length,
          addedBy: req.user!.email
        }
      }
    });

    res.status(201).json(createdQuestions);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error adding questions:', error);
    res.status(500).json({ error: error.message || 'Failed to add questions' });
  }
});

// Start quiz attempt
router.post('/:id/attempts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get quiz with lesson and course info
    const quiz = await prisma.quiz.findUnique({
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
                    enrollments: {
                      where: {
                        userId: req.user.id,
                        status: 'ACTIVE',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        questions: {
          select: {
            id: true,
            type: true,
            text: true,
            options: true,
            points: true,
            mediaRef: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found',
      });
    }

    // Check if user is enrolled and course is published
    if (quiz.lesson.section.course.state !== 'PUBLISHED' || !quiz.lesson.section.course.enrollments.length) {
      return res.status(403).json({
        success: false,
        error: 'Access denied or course not available',
      });
    }

    // Check attempt limit
    const existingAttempts = await prisma.attempt.count({
      where: {
        quizId: id,
        userId: req.user!.id,
      },
    });

    if (existingAttempts >= quiz.maxAttempts) {
      return res.status(409).json({
        success: false,
        error: `Maximum attempts (${quiz.maxAttempts}) reached`,
      });
    }

    // Check if there's an active attempt
    const activeAttempt = await prisma.attempt.findFirst({
      where: {
        quizId: id,
        userId: req.user!.id,
        status: 'IN_PROGRESS',
      },
    });

    if (activeAttempt) {
      return res.status(409).json({
        success: false,
        error: 'An attempt is already in progress',
        data: activeAttempt,
      });
    }

    // Calculate max score
    const maxScore = quiz.questions.reduce((total: number, q: any) => total + q.points, 0);

    // Create attempt
    const attempt = await prisma.attempt.create({
      data: {
        quizId: id,
        userId: req.user!.id,
        status: 'IN_PROGRESS',
        maxScore,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      },
    });

    // Shuffle questions if enabled
    let questions = quiz.questions;
    if (quiz.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Shuffle options if enabled
    if (quiz.shuffleAnswers) {
      questions = questions.map((q: any) => ({
        ...q,
        options: q.options.length ? [...q.options].sort(() => Math.random() - 0.5) : q.options,
      }));
    }

    res.status(201).json({
      attempt: {
        id: attempt.id,
        startAt: attempt.startAt,
        timeLimit: quiz.timeLimit,
        maxScore: attempt.maxScore,
      },
      quiz: {
        id: quiz.id,
        timeLimit: quiz.timeLimit,
        passMark: quiz.passMark,
      },
      questions: questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        points: q.points,
        mediaRef: q.mediaRef,
      })),
    });
  } catch (error: any) {
    console.error('Error starting attempt:', error);
    res.status(500).json({ error: 'Failed to start quiz attempt' });
  }
});

// Submit quiz attempt
router.post('/attempts/:id/submit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = submitAnswersSchema.parse(req.body);
    const { answers } = validatedData;

    // Get attempt with quiz and questions
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found',
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (attempt.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(409).json({
        success: false,
        error: 'Attempt is not in progress',
      });
    }

    // Check time limit
    if (attempt.quiz.timeLimit) {
      const timeElapsed = Date.now() - attempt.startAt.getTime();
      const timeLimit = attempt.quiz.timeLimit * 60 * 1000; // Convert minutes to milliseconds
      
      if (timeElapsed > timeLimit) {
        return res.status(409).json({
          success: false,
          error: 'Time limit exceeded',
        });
      }
    }

    // Grade the attempt
    let totalScore = 0;
    const submissions = [];

    for (const question of attempt.quiz.questions) {
      const userAnswer = answers[question.id];
      let score = 0;

      if (userAnswer !== undefined && userAnswer !== null) {
        if (question.type === 'MCQ_SINGLE') {
          // Single correct answer
          if (question.answers.includes(String(userAnswer))) {
            score = question.points;
          }
        } else if (question.type === 'MCQ_MULTI') {
          // Multiple correct answers
          const userAnswers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
          const correctAnswers = question.answers;
          
          // Calculate partial credit
          const correctCount = userAnswers.filter(ans => correctAnswers.includes(ans)).length;
          const incorrectCount = userAnswers.filter(ans => !correctAnswers.includes(ans)).length;
          const totalCorrect = correctAnswers.length;
          
          if (incorrectCount === 0 && correctCount === totalCorrect) {
            score = question.points; // Full credit
          } else if (correctCount > 0 && incorrectCount === 0) {
            score = (correctCount / totalCorrect) * question.points; // Partial credit
          }
        } else if (question.type === 'ESSAY') {
          // Essay questions need manual grading
          score = 0; // Will be graded manually
        }
      }

      totalScore += score;

      // Create submission record
      submissions.push({
        attemptId: attempt.id,
        questionId: question.id,
        response: userAnswer,
        score: question.type === 'ESSAY' ? null : score,
      });
    }

    // Create submissions
    await prisma.submission.createMany({
      data: submissions,
    });

    // Calculate if passed
    const passed = (totalScore / attempt.maxScore!) * 100 >= attempt.quiz.passMark;

    // Update attempt
    const updatedAttempt = await prisma.attempt.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        endAt: new Date(),
        score: totalScore,
        passed,
      },
      include: {
        submissions: {
          include: {
            question: true,
          },
        },
        quiz: {
          select: {
            passMark: true,
            showResults: true,
          },
        },
      },
    });

    // Log the attempt
    logAudit('submit_attempt', req.user.id, 'attempt', {
      attemptId: id,
      quizId: attempt.quiz.id,
      score: totalScore,
      passed,
    });

    // Prepare response based on showResults setting
    let responseData: any = {
      attempt: {
        id: updatedAttempt.id,
        score: updatedAttempt.score,
        maxScore: updatedAttempt.maxScore,
        passed: updatedAttempt.passed,
        endAt: updatedAttempt.endAt,
      },
    };

    if (attempt.quiz.showResults) {
      responseData.results = updatedAttempt.submissions.map((sub: any) => ({
        questionId: sub.questionId,
        questionText: sub.question.text,
        userAnswer: sub.response,
        correctAnswers: sub.question.answers,
        score: sub.score,
        points: sub.question.points,
      }));
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Submit attempt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit attempt',
    });
  }
});

// Get quiz by ID (for instructors/admins)
router.get('/:id', authMiddleware, requireRole(['INSTRUCTOR', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz ID format',
      });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
        questions: {
          orderBy: { createdAt: 'asc' },
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { startAt: 'desc' },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found',
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Check permission
    if (req.user.role !== 'ADMIN' && quiz.lesson.section.course.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    logger.error('Get quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz',
    });
  }
});

export default router;
