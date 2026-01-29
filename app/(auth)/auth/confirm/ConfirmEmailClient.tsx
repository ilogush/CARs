'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'

interface ConfirmEmailClientProps {
  error?: string
}

export default function ConfirmEmailClient({ error: initialError }: ConfirmEmailClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    initialError ? 'error' : 'loading'
  )
  const [message, setMessage] = useState(initialError || 'Подтверждение email...')

  useEffect(() => {
    if (initialError) {
      toast.error(initialError)
      return
    }

    // Check if user is already confirmed
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setStatus('success')
        setMessage('Email успешно подтвержден! Вы будете перенаправлены...')
        toast.success('Email успешно подтвержден!')
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 2000)
      } else {
        setStatus('error')
        setMessage('Неверная ссылка подтверждения. Попробуйте войти вручную.')
        toast.error('Неверная ссылка подтверждения. Попробуйте войти вручную.')
      }
    }

    checkSession()
  }, [initialError, router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Подтверждение email
          </h2>
        </div>

        <div className="mt-8">
          {status === 'loading' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">{message}</p>
              <a
                href="/auth/login"
                className="font-medium text-gray-800 hover:text-gray-500"
              >
                Go to login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

