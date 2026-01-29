'use client'

import { useEffect } from 'react'
import { useToast } from '@/lib/toast'

interface InfoMessageProps {
  message: string
  type?: 'error' | 'warning' | 'info'
}

/**
 * Component for displaying messages via toast
 * Used in Server Components to show errors and warnings
 */
export default function InfoMessage({ message, type = 'info' }: InfoMessageProps) {
  const toast = useToast()

  useEffect(() => {
    if (type === 'error') {
      toast.error(message)
    } else if (type === 'warning') {
      toast.warning(message) // Fixed: use warning instead of error
    } else if (type === 'info') {
      toast.info(message)
    }
  }, [message, type, toast])

  return null
}


