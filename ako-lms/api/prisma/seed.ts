import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@akocourses.com' },
    update: {},
    create: {
      email: 'admin@akocourses.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      locale: 'en',
      timezone: 'Africa/Cairo',
    },
  })

  // Create instructor user
  const instructorPassword = await bcrypt.hash('instructor123', 12)
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@akocourses.com' },
    update: {},
    create: {
      email: 'instructor@akocourses.com',
      password: instructorPassword,
      role: UserRole.INSTRUCTOR,
      firstName: 'John',
      lastName: 'Instructor',
      locale: 'en',
      timezone: 'Africa/Cairo',
    },
  })

  // Create student user
  const studentPassword = await bcrypt.hash('student123', 12)
  const student = await prisma.user.upsert({
    where: { email: 'student@akocourses.com' },
    update: {},
    create: {
      email: 'student@akocourses.com',
      password: studentPassword,
      role: UserRole.STUDENT,
      firstName: 'Jane',
      lastName: 'Student',
      locale: 'en',
      timezone: 'Africa/Cairo',
    },
  })

  // Create parent user
  const parentPassword = await bcrypt.hash('parent123', 12)
  const parent = await prisma.user.upsert({
    where: { email: 'parent@akocourses.com' },
    update: {},
    create: {
      email: 'parent@akocourses.com',
      password: parentPassword,
      role: UserRole.PARENT,
      firstName: 'Mary',
      lastName: 'Parent',
      locale: 'en',
      timezone: 'Africa/Cairo',
    },
  })

  // Create assistant user
  const assistantPassword = await bcrypt.hash('assistant123', 12)
  const assistant = await prisma.user.upsert({
    where: { email: 'assistant@akocourses.com' },
    update: {},
    create: {
      email: 'assistant@akocourses.com',
      password: assistantPassword,
      role: UserRole.ASSISTANT,
      firstName: 'Bob',
      lastName: 'Assistant',
      locale: 'en',
      timezone: 'Africa/Cairo',
    },
  })

  // Link parent to student
  await prisma.parentLink.upsert({
    where: {
      parentId_studentId: {
        parentId: parent.id,
        studentId: student.id,
      },
    },
    update: {},
    create: {
      parentId: parent.id,
      studentId: student.id,
    },
  })

  // Create sample course
  const course = await prisma.course.upsert({
    where: { id: 'sample-course-1' },
    update: {},
    create: {
      id: 'sample-course-1',
      title: 'Introduction to Programming',
      description: 'Learn the basics of programming with hands-on exercises and projects.',
      ownerId: instructor.id,
      state: 'PUBLISHED',
      language: 'en',
    },
  })

  // Create sample section
  const section = await prisma.section.upsert({
    where: { id: 'sample-section-1' },
    update: {},
    create: {
      id: 'sample-section-1',
      courseId: course.id,
      title: 'Getting Started',
      order: 1,
    },
  })

  // Create sample lesson
  const lesson = await prisma.lesson.upsert({
    where: { id: 'sample-lesson-1' },
    update: {},
    create: {
      id: 'sample-lesson-1',
      sectionId: section.id,
      type: 'VIDEO',
      title: 'Welcome to Programming',
      description: 'An introduction to the world of programming.',
      order: 1,
      unlockAt: new Date(),
      requiresPrevCompletion: false,
      requiresQuizPass: false,
    },
  })

  // Enroll student in course
  await prisma.enrollment.upsert({
    where: {
      courseId_userId: {
        courseId: course.id,
        userId: student.id,
      },
    },
    update: {},
    create: {
      courseId: course.id,
      userId: student.id,
      status: 'ACTIVE',
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Sample accounts created:')
  console.log('👤 Admin: admin@akocourses.com / admin123')
  console.log('👨‍🏫 Instructor: instructor@akocourses.com / instructor123')
  console.log('👨‍🎓 Student: student@akocourses.com / student123')
  console.log('👨‍👩‍👧‍👦 Parent: parent@akocourses.com / parent123')
  console.log('👨‍💼 Assistant: assistant@akocourses.com / assistant123')
  console.log('\n📚 Sample course: "Introduction to Programming" created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
