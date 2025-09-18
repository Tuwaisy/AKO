'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Users, BarChart3, Plus, Settings, Calendar, Edit, Trash2, Upload, FileText, PlayCircle, X, Save, Eye } from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
}

interface Course {
  id: string
  title: string
  description: string
  enrollmentCount: number
  status: string
  language?: string
  state?: string
  createdAt?: string
  _count?: {
    enrollments: number
    sections: number
  }
}

interface NewCourseData {
  title: string
  description: string
  language: string
  state: string
}

interface Section {
  id: string
  title: string
  description: string
  order: number
  lessons?: Lesson[]
}

interface Lesson {
  id: string
  title: string
  type: string
  content?: string
  order: number
  mediaAssets?: MediaAsset[]
}

interface MediaAsset {
  id: string
  url: string
  originalName: string
  mimeType: string
  size: number
  duration?: number
}

interface Quiz {
  id: string
  timeLimit?: number
  maxAttempts: number
  passMark: number
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  showResults: boolean
  questions?: Question[]
}

interface Question {
  id: string
  type: 'MCQ_SINGLE' | 'MCQ_MULTI' | 'ESSAY'
  text: string
  options: string[]
  answers: string[]
  points: number
}

export default function InstructorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeEnrollments: 0,
    completionRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'dashboard' | 'create-course' | 'manage-course' | 'create-quiz' | 'content' | 'materials' | 'quizzes' | 'settings'>('dashboard')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false)
  const [newCourseData, setNewCourseData] = useState<NewCourseData>({
    title: '',
    description: '',
    language: 'en',
    state: 'DRAFT'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API call function
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken')
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    
    const response = await fetch(`${apiUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Load courses from API
  const loadCourses = async () => {
    try {
      const response = await apiCall('/courses')
      if (response.success) {
        setCourses(response.data)
        setStats({
          totalCourses: response.data.length,
          totalStudents: response.data.reduce((sum: number, course: Course) => sum + (course._count?.enrollments || 0), 0),
          activeEnrollments: response.data.reduce((sum: number, course: Course) => sum + (course._count?.enrollments || 0), 0),
          completionRate: 78 // This would come from analytics endpoint
        })
      }
    } catch (error) {
      console.error('Failed to load courses:', error)
      // Fall back to demo data
      setCourses([
        {
          id: '1',
          title: 'Introduction to Programming',
          description: 'Learn the basics of programming',
          enrollmentCount: 25,
          status: 'Published'
        },
        {
          id: '2', 
          title: 'Advanced JavaScript',
          description: 'Master modern JavaScript concepts',
          enrollmentCount: 18,
          status: 'Draft'
        }
      ])

      setStats({
        totalCourses: 2,
        totalStudents: 43,
        activeEnrollments: 25,
        completionRate: 78
      })
    }
  }

  // Create new course
  const createCourse = async () => {
    setIsSubmitting(true)
    try {
      const response = await apiCall('/courses', {
        method: 'POST',
        body: JSON.stringify(newCourseData),
      })

      if (response.success) {
        await loadCourses() // Reload courses
        setShowCreateCourseModal(false)
        setNewCourseData({ title: '', description: '', language: 'en', state: 'DRAFT' })
      }
    } catch (error) {
      console.error('Failed to create course:', error)
      alert('Failed to create course: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete course
  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return
    }

    try {
      await apiCall(`/courses/${courseId}`, {
        method: 'DELETE',
      })
      await loadCourses() // Reload courses
    } catch (error) {
      console.error('Failed to delete course:', error)
      alert('Failed to delete course: ' + (error as Error).message)
    }
  }

  useEffect(() => {
    // Check authentication
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('accessToken')
    
    if (!storedUser || !token) {
      router.push('/auth/login')
      return
    }

    const userData = JSON.parse(storedUser)
    setUser(userData)

    // Load courses from API
    loadCourses().finally(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  // Quiz creation state
  const [quizData, setQuizData] = useState({
    timeLimit: '',
    maxAttempts: 3,
    passMark: 70,
    shuffleQuestions: false,
    shuffleAnswers: false,
    showResults: true
  })
  const [questions, setQuestions] = useState<Partial<Question>[]>([])

  // Add new question
  const addQuestion = () => {
    setQuestions([...questions, {
      type: 'MCQ_SINGLE',
      text: '',
      options: ['', '', '', ''],
      answers: [],
      points: 1
    }])
  }

  // Update question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  // Remove question
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  // Render quiz creation interface
  const renderQuizCreation = () => {
    return (
      <div className="space-y-6">
        {/* Quiz Creation Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button 
                onClick={() => setActiveView('manage-course')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Course
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Create Quiz</h2>
              <p className="text-gray-600">Add an interactive quiz to test student knowledge</p>
            </div>
          </div>
        </div>

        {/* Quiz Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
              <input
                type="number"
                value={quizData.timeLimit}
                onChange={(e) => setQuizData({ ...quizData, timeLimit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Leave empty for no limit"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
              <input
                type="number"
                min="1"
                value={quizData.maxAttempts}
                onChange={(e) => setQuizData({ ...quizData, maxAttempts: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pass Mark (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={quizData.passMark}
                onChange={(e) => setQuizData({ ...quizData, passMark: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={quizData.shuffleQuestions}
                onChange={(e) => setQuizData({ ...quizData, shuffleQuestions: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Shuffle questions for each attempt</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={quizData.shuffleAnswers}
                onChange={(e) => setQuizData({ ...quizData, shuffleAnswers: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Shuffle answer options</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={quizData.showResults}
                onChange={(e) => setQuizData({ ...quizData, showResults: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Show results after completion</span>
            </label>
          </div>
        </div>

        {/* Quiz Questions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
            <button
              onClick={addQuestion}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Question</span>
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h4>
              <p className="text-gray-600">Start building your quiz by adding your first question</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                    <div className="flex items-center space-x-2">
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="MCQ_SINGLE">Single Choice</option>
                        <option value="MCQ_MULTI">Multiple Choice</option>
                        <option value="ESSAY">Essay</option>
                      </select>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                      <textarea
                        value={question.text}
                        onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter your question..."
                      />
                    </div>

                    {question.type !== 'ESSAY' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type={question.type === 'MCQ_SINGLE' ? 'radio' : 'checkbox'}
                              name={`correct-${index}`}
                              checked={question.answers?.includes(optionIndex.toString())}
                              onChange={(e) => {
                                let newAnswers = question.answers || []
                                if (question.type === 'MCQ_SINGLE') {
                                  newAnswers = e.target.checked ? [optionIndex.toString()] : []
                                } else {
                                  if (e.target.checked) {
                                    newAnswers = [...newAnswers, optionIndex.toString()]
                                  } else {
                                    newAnswers = newAnswers.filter(a => a !== optionIndex.toString())
                                  }
                                }
                                updateQuestion(index, 'answers', newAnswers)
                              }}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(question.options || [])]
                                newOptions[optionIndex] = e.target.value
                                updateQuestion(index, 'options', newOptions)
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={question.points}
                          onChange={(e) => updateQuestion(index, 'points', parseFloat(e.target.value))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {questions.length > 0 && (
            <div className="mt-6 flex items-center space-x-3">
              <button className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                Save Quiz
              </button>
              <button 
                onClick={() => setActiveView('manage-course')}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render course management interface
  const renderCourseManagement = () => {
    if (!selectedCourse) return null

    return (
      <div className="space-y-6">
        {/* Course Management Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button 
                onClick={() => setActiveView('dashboard')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCourse.title}</h2>
              <p className="text-gray-600">{selectedCourse.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-sm rounded-full ${
                selectedCourse.state === 'PUBLISHED' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedCourse.state}
              </span>
            </div>
          </div>
        </div>

        {/* Course Management Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'content', label: 'Course Content', icon: FileText },
                { id: 'materials', label: 'Materials', icon: Upload },
                { id: 'quizzes', label: 'Quizzes', icon: PlayCircle },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                      activeView === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                    onClick={() => setActiveView(tab.id as any)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeView === 'content' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Course Sections</h3>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    <Plus className="h-4 w-4" />
                    <span>Add Section</span>
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No sections yet</h4>
                  <p className="text-gray-600">Create your first section to add lessons and organize your course content</p>
                </div>
              </div>
            )}

            {activeView === 'materials' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Course Materials</h3>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Upload Material</span>
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No materials uploaded</h4>
                  <p className="text-gray-600">Upload videos, documents, and other learning materials for your course</p>
                </div>
              </div>
            )}

            {activeView === 'quizzes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Course Quizzes</h3>
                  <button 
                    onClick={() => {
                      setActiveView('create-quiz')
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Quiz</span>
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No quizzes created</h4>
                  <p className="text-gray-600">Create interactive quizzes to test your students' knowledge</p>
                </div>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Course Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Course Title</label>
                    <input
                      type="text"
                      value={selectedCourse.title}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={selectedCourse.description}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Course Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                  <button className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Render different views based on activeView state
  if (activeView === 'manage-course' || activeView === 'content' || activeView === 'materials' || activeView === 'quizzes' || activeView === 'settings') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">AKO Instructor</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Welcome, {user?.firstName} {user?.lastName}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderCourseManagement()}
        </div>
      </div>
    )
  }

  if (activeView === 'create-quiz') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">AKO Instructor</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Welcome, {user?.firstName} {user?.lastName}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderQuizCreation()}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">AKO Instructor</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user?.firstName} {user?.lastName}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Courses</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalCourses}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Enrollments</p>
                <p className="text-3xl font-bold text-purple-600">{stats.activeEnrollments}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-orange-600">{stats.completionRate}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setShowCreateCourseModal(true)}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <Plus className="h-6 w-6 text-blue-600" />
              <span className="font-medium text-gray-900">Create New Course</span>
            </button>
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors">
              <Users className="h-6 w-6 text-green-600" />
              <span className="font-medium text-gray-900">Manage Students</span>
            </button>
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <Upload className="h-6 w-6 text-purple-600" />
              <span className="font-medium text-gray-900">Upload Materials</span>
            </button>
          </div>
        </div>

        {/* My Courses */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
            <button 
              onClick={() => setShowCreateCourseModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Course</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                    course.state === 'PUBLISHED' || course.status === 'Published'
                      ? 'bg-green-100 text-green-800' 
                      : course.state === 'DRAFT' || course.status === 'Draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {course.state || course.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{course._count?.enrollments || course.enrollmentCount || 0} students</span>
                  <span>{course._count?.sections || 0} sections</span>
                </div>

                {/* Course Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      setSelectedCourse(course)
                      setActiveView('manage-course')
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedCourse(course)
                      // Navigate to course content management
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Content</span>
                  </button>
                  <button 
                    onClick={() => deleteCourse(course.id)}
                    className="flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {courses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first course</p>
              <button 
                onClick={() => setShowCreateCourseModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Course</span>
              </button>
            </div>
          )}
        </div>

        {/* Create Course Modal */}
        {showCreateCourseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Course</h3>
                <button 
                  onClick={() => setShowCreateCourseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); createCourse(); }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCourseData.title}
                      onChange={(e) => setNewCourseData({ ...newCourseData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter course title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newCourseData.description}
                      onChange={(e) => setNewCourseData({ ...newCourseData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter course description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={newCourseData.language}
                      onChange={(e) => setNewCourseData({ ...newCourseData, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="fr">French</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Status
                    </label>
                    <select
                      value={newCourseData.state}
                      onChange={(e) => setNewCourseData({ ...newCourseData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="SCHEDULED">Scheduled</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Create Course</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateCourseModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}