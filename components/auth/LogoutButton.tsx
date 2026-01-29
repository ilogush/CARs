'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ReactNode } from 'react'

interface LogoutButtonProps {
  className?: string
  icon?: ReactNode
}

export default function LogoutButton({ className, icon }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (className) {
    return (
      <button onClick={handleLogout} className={className}>
        {icon && icon}
        <span>Log out</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Log out
    </button>
  )
}
