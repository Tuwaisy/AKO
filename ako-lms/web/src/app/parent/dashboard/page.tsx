'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, BookOpen, Award, Calendar, TrendingUp, Eye } from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
}

interface Child {
  id: string
  firstName: string
  lastName: string
  email: string
  coursesEnrolled: number
  completionRate: number
  lastActivity: string
}

export default function ParentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [stats, setStats] = useState({
    totalChildren: 0,
    totalCourses: 0,
    averageProgress: 0,
    thisWeekActivity: 0
  })
  const [loading, setLoading] = useState(true)

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

    // For demo purposes, set sample data
    setChildren([
      {
        id: '1',
        firstName: 'Jane',
        lastName: 'Student',
        email: 'student@akocourses.com',
        coursesEnrolled: 3,
        completionRate: 78,
        lastActivity: '2 hours ago'
      },
      {
        id: '2',
        firstName: 'John',
        lastName: 'Student',
        email: 'john.student@akocourses.com',
        coursesEnrolled: 2,
        completionRate: 92,
        lastActivity: '1 day ago'
      }
    ])

    setStats({
      totalChildren: 2,
      totalCourses: 5,
      averageProgress: 85,
      thisWeekActivity: 12
    })

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
                <Users className="h-8 w-8 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-900">AKO Parent Portal</h1>
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
                <p className="text-sm font-medium text-gray-600">My Children</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalChildren}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>

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
                <p className="text-sm font-medium text-gray-600">Average Progress</p>
                <p className="text-3xl font-bold text-purple-600">{stats.averageProgress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week Activity</p>
                <p className="text-3xl font-bold text-orange-600">{stats.thisWeekActivity}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Children Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Children's Progress</h2>
          
          <div className="space-y-6">
            {children.map((child) => (
              <div key={child.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {child.firstName} {child.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{child.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Last Activity</p>
                      <p className="font-medium text-gray-900">{child.lastActivity}</p>
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Courses Enrolled</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{child.coursesEnrolled}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-gray-900">Completion Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-1">{child.completionRate}%</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-900">Performance</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {child.completionRate > 80 ? 'Excellent' : child.completionRate > 60 ? 'Good' : 'Needs Support'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Jane completed "Introduction to Programming"</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">John started "Advanced JavaScript" course</p>
                <p className="text-sm text-gray-600">1 day ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Jane achieved 90% score in quiz</p>
                <p className="text-sm text-gray-600">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}