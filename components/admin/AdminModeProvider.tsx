'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'

interface AdminModeContextType {
  isAdminMode: boolean
  companyId: number | null
  exitAdminMode: () => void
}

const AdminModeContext = createContext<AdminModeContextType>({
  isAdminMode: false,
  companyId: null,
  exitAdminMode: () => {},
})

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [companyId, setCompanyId] = useState<number | null>(null)

  useEffect(() => {
    const adminMode = searchParams.get('admin_mode') === 'true'
    const companyIdParam = searchParams.get('company_id')
    
    setIsAdminMode(adminMode)
    setCompanyId(companyIdParam ? parseInt(companyIdParam) : null)
  }, [searchParams])

  const exitAdminMode = async () => {
    if (companyId) {
      try {
        const res = await fetch(`/api/admin/enter-company?company_id=${companyId}`, {
          method: 'DELETE'
        })
        
        if (res.ok) {
          router.push('/dashboard/companies')
        } else {
          router.push('/dashboard/companies')
        }
      } catch (error) {
        router.push('/dashboard/companies')
      }
    } else {
      router.push('/dashboard/companies')
    }
  }

  return (
    <AdminModeContext.Provider value={{ isAdminMode, companyId, exitAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  )
}

export function useAdminMode() {
  return useContext(AdminModeContext)
}
