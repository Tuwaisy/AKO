'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, BookOpen, HelpCircle, MessageSquare, Calendar, Clock } from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
}

interface SupportTicket {
  id: string
  title: string
  student: string
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'in-progress' | 'resolved'
  created: string
}

export default function AssistantDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [stats, setStats] = useState({
    activeTickets: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
    studentsHelped: 0
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
    setTickets([
      {
        id: '1',
        title: 'Cannot access video lectures',
        student: 'Jane Student',
        priority: 'high',
        status: 'open',
        created: '2 hours ago'
      },
      {
        id: '2',
        title: 'Quiz submission not working',
        student: 'John Student', 
        priority: 'medium',
        status: 'in-progress',
        created: '4 hours ago'
      },
      {
        id: '3',
        title: 'Password reset request',
        student: 'Mary Johnson',
        priority: 'low',
        status: 'open',
        created: '1 day ago'
      }
    ])

    setStats({
      activeTickets: 8,
      resolvedToday: 5,
      avgResponseTime: 25,
      studentsHelped: 34
    })

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-blue-600 bg-blue-100'
      case 'in-progress':
        return 'text-orange-600 bg-orange-100'
      case 'resolved':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
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
                <HelpCircle className="h-8 w-8 text-teal-600" />
                <h1 className="text-2xl font-bold text-gray-900">AKO Support Assistant</h1>
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
                <p className="text-sm font-medium text-gray-600">Active Tickets</p>
                <p className="text-3xl font-bold text-blue-600">{stats.activeTickets}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.resolvedToday}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response (min)</p>
                <p className="text-3xl font-bold text-orange-600">{stats.avgResponseTime}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Students Helped</p>
                <p className="text-3xl font-bold text-purple-600">{stats.studentsHelped}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Support Tickets</h2>
            <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors">
              View All Tickets
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Ticket</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-sm text-gray-600">#{ticket.id}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{ticket.student}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{ticket.created}</td>
                    <td className="py-3 px-4">
                      <button className="text-teal-600 hover:text-teal-800 font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Create New Ticket</h3>
            </div>
            <p className="text-gray-600 mb-4">Log a new support request or issue for tracking</p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              New Ticket
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-gray-900">Knowledge Base</h3>
            </div>
            <p className="text-gray-600 mb-4">Access common solutions and documentation</p>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              Browse KB
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="h-6 w-6 text-purple-600" />
              <h3 className="font-semibold text-gray-900">User Management</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage student accounts and permissions</p>
            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              Manage Users
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}