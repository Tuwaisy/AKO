'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

interface LoginFormData {
  email: string
  password: string
}

interface LoginResponse {
  success: boolean
  message?: string
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  user?: {
    id: string
    email: string
    role: string
    firstName: string
    lastName: string
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const loginUrl = `${apiUrl}/auth/login`;
      
      console.log('Attempting login to:', loginUrl);
      console.log('Form data:', { email: formData.email, password: '***' });

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data: LoginResponse = await response.json()
      console.log('Response data:', data);

      if (response.ok && data.success) {
        // Store tokens in localStorage (in production, consider more secure storage)
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken)
          console.log('Access token stored:', data.accessToken.substring(0, 20) + '...')
        } else {
          console.error('No access token in response')
        }
        
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken)
          console.log('Refresh token stored')
        } else {
          console.error('No refresh token in response')
        }
        
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
          console.log('User data stored:', data.user)
        } else {
          console.error('No user data in response')
        }

        // Redirect based on user role
        const userRole = data.user?.role.toLowerCase()
        console.log('Redirecting user with role:', userRole);
        
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
            router.push('/dashboard')
        }
      } else {
        setError(data.message || `Login failed (Status: ${response.status}). Please try again.`)
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your connection and try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to AKO Courses
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your learning management system
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg"
          onSubmit={handleSubmit}
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Contact your administrator
              </Link>
            </p>
          </div>
        </motion.form>

        {/* Demo credentials for testing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4"
        >
          <h3 className="text-sm font-medium text-yellow-800 mb-3">Demo Accounts - Quick Login:</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-yellow-700">
                <p><strong>Admin:</strong> admin@akocourses.com / admin123</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    email: 'admin@akocourses.com',
                    password: 'admin123'
                  });
                }}
                className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Fill Admin
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-yellow-700">
                <p><strong>Instructor:</strong> instructor@akocourses.com / instructor123</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    email: 'instructor@akocourses.com',
                    password: 'instructor123'
                  });
                }}
                className="ml-2 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Fill Instructor
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-yellow-700">
                <p><strong>Student:</strong> student@akocourses.com / student123</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    email: 'student@akocourses.com',
                    password: 'student123'
                  });
                }}
                className="ml-2 px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                Fill Student
              </button>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-yellow-300">
            <p className="text-xs text-yellow-600 text-center mb-2">
              Click "Fill" buttons to auto-complete form, then click "Sign In"
            </p>
            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={async () => {
                  setFormData({
                    email: 'admin@akocourses.com',
                    password: 'admin123'
                  });
                  // Trigger login automatically
                  setTimeout(() => {
                    const form = document.querySelector('form');
                    if (form) {
                      const event = new Event('submit', { bubbles: true, cancelable: true });
                      form.dispatchEvent(event);
                    }
                  }, 100);
                }}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Quick Admin Login
              </button>
              <button
                type="button"
                onClick={async () => {
                  setFormData({
                    email: 'student@akocourses.com',
                    password: 'student123'
                  });
                  // Trigger login automatically
                  setTimeout(() => {
                    const form = document.querySelector('form');
                    if (form) {
                      const event = new Event('submit', { bubbles: true, cancelable: true });
                      form.dispatchEvent(event);
                    }
                  }, 100);
                }}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                Quick Student Login
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
