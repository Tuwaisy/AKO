import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to AKO Courses
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Advanced Learning Management System
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/login"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/courses"
              className="border border-input hover:bg-accent hover:text-accent-foreground px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-16 grid text-center lg:mb-0 lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Role-Based Access
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Student, Parent, Assistant, Instructor, and Admin roles with granular permissions.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Secure Videos
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            DRM-protected video streaming with watermarking and anti-cheat measures.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Advanced Quizzes
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            MCQ and essay questions with image support, time limits, and automated grading.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Analytics & Reports
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Comprehensive progress tracking, performance analytics, and detailed reports.
          </p>
        </div>
      </div>
    </main>
  )
}
