'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import { validateLatinOnly, validateEmail } from '@/lib/validation'

export default function LoginForm() {
  const router = useRouter()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const validateForm = () => {
    const errors: {
      email?: string
      password?: string
    } = {}

    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError

    const passwordError = validateLatinOnly(password, 'Password')
    if (passwordError) errors.password = passwordError

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      console.log('Login successful, data:', data)

      // Логируем успешный вход
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include'
        })
      } catch (logError) {
        console.error('Error logging login:', logError)
        // Не прерываем процесс входа, даже если логирование не удалось
      }

      toast.success('Login successful')

      // Wait for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('Redirecting to dashboard...')
      // Use Next.js router instead of window.location
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('Login error:', error)

      // Логируем неудачную попытку входа
      try {
        await fetch('/api/auth/login-failed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            error: error.message || 'Authentication failed'
          })
        })
      } catch (logError) {
        console.error('Error logging failed login:', logError)
      }

      toast.error(error.message || 'Login error')
      setLoading(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${fieldErrors.email ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
              } placeholder-gray-500`}
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                const error = validateEmail(e.target.value)
                setFieldErrors(prev => ({ ...prev, email: error || undefined }))
              }
            }}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 pr-10 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${fieldErrors.password ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
                } placeholder-gray-500`}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) {
                  const error = validateLatinOnly(e.target.value, 'Password')
                  setFieldErrors(prev => ({ ...prev, password: error || undefined }))
                }
              }}
              minLength={6}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </div>

      <div className="text-center">
        <a
          href="/auth/register"
          className="font-medium text-gray-500 hover:text-gray-900 transition-colors duration-200"
        >
          No account? Register
        </a>
      </div>
    </form>
  )
}
