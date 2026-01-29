'use client'

import { useSearchParams } from 'next/navigation'

/**
 * Hook to build links with admin mode parameters
 * Automatically appends admin_mode=true&company_id=X if in admin mode
 */
export function useAdminLink() {
    const searchParams = useSearchParams()
    const adminMode = searchParams.get('admin_mode') === 'true'
    const companyId = searchParams.get('company_id')

    /**
     * Build a link with admin mode parameters if applicable
     */
    const buildLink = (path: string): string => {
        if (adminMode && companyId) {
            const separator = path.includes('?') ? '&' : '?'
            return `${path}${separator}admin_mode=true&company_id=${companyId}`
        }
        return path
    }

    /**
     * Get admin mode state
     */
    const getAdminState = () => ({
        adminMode,
        companyId,
        isAdminMode: adminMode && !!companyId
    })

    return {
        buildLink,
        adminMode,
        companyId,
        isAdminMode: adminMode && !!companyId,
        getAdminState
    }
}

export default useAdminLink
