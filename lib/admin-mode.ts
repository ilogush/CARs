import { NextRequest } from 'next/server'
import { getCurrentUser } from './auth'

/**
 * Получает company_id из запроса, если админ в режиме Owner
 * @param request NextRequest
 * @returns company_id или null
 */
export async function getAdminModeCompanyId(request: NextRequest): Promise<number | null> {
  try {
    const user = await getCurrentUser()
    
    // Только для админов
    if (!user || user.role !== 'admin') {
      return null
    }
    
    // Проверяем параметры admin_mode и company_id в query string
    const url = new URL(request.url)
    const adminMode = url.searchParams.get('admin_mode') === 'true'
    const companyId = url.searchParams.get('company_id')
    
    // Только если admin_mode=true И указан company_id
    if (adminMode && companyId) {
      return parseInt(companyId)
    }
    
    return null
  } catch (error) {
    console.error('Error getting admin mode company ID:', error)
    return null
  }
}

/**
 * Проверяет, находится ли админ в режиме Owner компании
 * @param request NextRequest
 * @returns true если админ в режиме Owner
 */
export async function isAdminInOwnerMode(request: NextRequest): Promise<boolean> {
  const companyId = await getAdminModeCompanyId(request)
  return companyId !== null
}
