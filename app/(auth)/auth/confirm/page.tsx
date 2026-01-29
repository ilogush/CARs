import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConfirmEmailClient from './ConfirmEmailClient'

// Force dynamic rendering (requires cookies for authentication)
export const dynamic = 'force-dynamic'

interface ConfirmPageProps {
  searchParams: Promise<{ code?: string; token_hash?: string; type?: string; error?: string }>
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Check if user is already confirmed
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/')
  }

  // Handle PKCE flow (code parameter)
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code)
    if (!error) {
      redirect('/')
    }
    // If error, show error message
    return <ConfirmEmailClient error={error.message} />
  }

  // Handle token_hash flow (legacy)
  if (params.token_hash && params.type === 'email') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: 'email',
    })

    if (!error) {
      redirect('/')
    }
    // If error, show error message
    return <ConfirmEmailClient error={error.message} />
  }

  // Show error if invalid parameters
  if (params.error) {
    return <ConfirmEmailClient error="Ошибка подтверждения email. Попробуйте войти вручную." />
  }

  // Show loading state
  return <ConfirmEmailClient />
}
