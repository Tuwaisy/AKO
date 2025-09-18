'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Search, 
  Filter,
  Clock,
  Users,
  Star,
  ChevronLeft,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface Course {
  id: string
  title: string
  description: string
  state: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  language?: string
  createdAt?: string
  owner?: {
    firstName: string
    lastName: string
  }
  enrollmentCount?: number
  isEnrolled?: boolean
}

export default function CoursesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'enrolled' | 'available'>('all')

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user')
    const accessToken = localStorage.getItem('accessToken')

    if (!userData || !accessToken) {
      router.push('/auth/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    fetchCourses(accessToken)
  }, [router])

  useEffect(() => {
    // Filter courses based on search term and filter
    let filtered = courses

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply enrollment filter
    if (selectedFilter === 'enrolled') {
      filtered = filtered.filter(course => course.isEnrolled)
    } else if (selectedFilter === 'available') {
      filtered = filtered.filter(course => !course.isEnrolled && course.state === 'PUBLISHED')
    }

    setFilteredCourses(filtered)
  }, [courses, searchTerm, selectedFilter])

  const fetchCourses = async (token: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      } else {
        setError('Failed to load courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setError('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      })

      if (response.ok) {
        // Refresh courses list
        fetchCourses(token)
      } else {
        setError('Failed to enroll in course')
      }
    } catch (error) {
      console.error('Error enrolling in course:', error)
      setError('Failed to enroll in course')
    }
  }

  const goBack = () => {
    const userRole = user?.role?.toLowerCase()
    switch (userRole) {
      case 'admin':
        router.push('/admin/dashboard')
        break
      case 'instructor':
        router.push('/instructor/dashboard')
        break
      case 'assistant':
        router.push('/assistant/dashboard')
        break
      case 'parent':
        router.push('/parent/dashboard')
        break
      case 'student':
        router.push('/student/dashboard')
        break
      default:
        router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={goBack} className="mr-4">
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
                <p className="text-sm text-gray-500">Browse and enroll in available courses</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-md p-4"
          >
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                All Courses
              </Button>
              <Button
                variant={selectedFilter === 'enrolled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('enrolled')}
              >
                My Courses
              </Button>
              <Button
                variant={selectedFilter === 'available' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('available')}
              >
                Available
              </Button>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
        </motion.div>

        {/* Courses Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No courses found' : 'No courses available'}
                </h3>
                <p className="text-gray-500 text-center">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters' 
                    : 'There are no courses available at this time.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                          <CardDescription className="line-clamp-3 mb-3">
                            {course.description}
                          </CardDescription>
                        </div>
                        <div className="ml-2">
                          {course.isEnrolled && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Course Info */}
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {course.enrollmentCount || 0}
                            </div>
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-1 ${
                                course.state === 'PUBLISHED' ? 'bg-green-500' :
                                course.state === 'DRAFT' ? 'bg-yellow-500' : 'bg-gray-500'
                              }`}></div>
                              {course.state}
                            </div>
                          </div>
                        </div>

                        {/* Instructor */}
                        {course.owner && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Instructor:</span> {course.owner.firstName} {course.owner.lastName}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2">
                          {course.isEnrolled ? (
                            <Button className="w-full" onClick={() => router.push(`/courses/${course.id}`)}>
                              <Play className="h-4 w-4 mr-2" />
                              Continue Learning
                            </Button>
                          ) : course.state === 'PUBLISHED' ? (
                            <Button 
                              className="w-full" 
                              onClick={() => handleEnroll(course.id)}
                            >
                              Enroll Now
                            </Button>
                          ) : (
                            <Button className="w-full" disabled>
                              Not Available
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}