'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { validateLatinOnly, validatePhone, validatePassword, validateEmail } from '@/lib/validation'

export default function RegisterUserForm() {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    phone?: string
    password?: string
  }>({})
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setLoading(true)

    // Validate all fields
    const errors: typeof fieldErrors = {}

    const nameError = validateLatinOnly(name, 'Name')
    if (nameError) errors.name = nameError

    const emailError = validateEmail(email) || validateLatinOnly(email, 'Email')
    if (emailError) errors.email = emailError

    const phoneError = validatePhone(phone)
    if (phoneError) errors.phone = phoneError

    const passwordValidation = validatePassword(password)
    if (passwordValidation) {
      errors.password = passwordValidation
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      // Показываем первую ошибку в toast
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast.error(firstError)
      }
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Register user with email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            role: 'client',
            name: name.trim(),
            phone: phone.trim(),
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // User record will be created automatically by database trigger
        // TODO: Save phone in separate table for clients (if created)

        // Check if email is sent
        if (authData.user.email_confirmed_at) {
          toast.success('Registration successful! Email already confirmed.')
        } else {
          toast.success('Registration successful! Check your email for confirmation.')
        }
        setSuccess(true)
      } else {
        toast.error('Error: user was not created')
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Registration error'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <a
            href="/auth/login"
            className="font-medium text-gray-800 hover:text-gray-500"
          >
            Go to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>

      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${fieldErrors.name ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
              } placeholder-gray-500`}
            placeholder=""
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (fieldErrors.name) {
                const error = validateLatinOnly(e.target.value, 'Name')
                setFieldErrors(prev => ({ ...prev, name: error || undefined }))
              }
            }}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-500 mb-1">
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
            placeholder=""
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                const error = validateLatinOnly(e.target.value, 'Email')
                setFieldErrors(prev => ({ ...prev, email: error || undefined }))
              }
            }}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-500 mb-1">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${fieldErrors.phone ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
              } placeholder-gray-500`}
            placeholder=""
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (fieldErrors.phone) {
                const error = validatePhone(e.target.value)
                setFieldErrors(prev => ({ ...prev, phone: error || undefined }))
              }
            }}
          />
          {fieldErrors.phone && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-500 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 pr-10 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${fieldErrors.password ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
                } placeholder-gray-500`}
              placeholder=""
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) {
                  const validation = validatePassword(e.target.value)
                  setFieldErrors(prev => ({ ...prev, password: validation || undefined }))
                }
              }}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </div>
    </form>
  )
}

