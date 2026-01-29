'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

interface AdminModeBadgeProps {
  companyId?: number
  companyName?: string
}

export function AdminModeBadge({ companyId, companyName }: AdminModeBadgeProps) {
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const searchParams = useSearchParams()
  const adminMode = searchParams.get('admin_mode') === 'true'

  useEffect(() => {
    setIsAdminMode(adminMode)
  }, [adminMode])

  const handleExit = async () => {
    if (!companyId) return

    setIsExiting(true)
    try {
      const supabase = await createClient()
      
      await fetch(`/api/admin/enter-company?company_id=${companyId}`, {
        method: 'DELETE'
      })

      // Редирект на страницу компаний
      window.location.href = '/dashboard/companies'
    } catch (error) {
      console.error('Error exiting admin mode:', error)
      setIsExiting(false)
    }
  }

  if (!isAdminMode || !companyId) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <ShieldCheckIcon className="h-6 w-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Админ режим
          </h3>
          <p className="text-xs text-red-600 mt-1">
            Вы вошли как администратор в компанию: {companyName || `ID: ${companyId}`}
          </p>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={handleExit}
              disabled={isExiting}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
            >
              <ArrowLeftIcon className="h-3 w-3 mr-1" />
              {isExiting ? 'Выход...' : 'Выйти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
