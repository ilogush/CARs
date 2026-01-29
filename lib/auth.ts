import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'
import type { User, UserRole } from '@/types/database.types'

/**
 * Получает текущего пользователя из сессии
 * @returns Пользователь или null, если не авторизован
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  // Получаем текущую сессию
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // Получаем полные данные пользователя из таблицы users
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) {
    return null
  }

  return user as User
}

/**
 * Требует, чтобы пользователь был авторизован и имел указанную роль
 * @param role Требуемая роль
 * @returns Пользователь с требуемой ролью
 * @throws Редирект на /auth/login, если не авторизован
 * @throws Редирект на /dashboard, если роль не соответствует
 */
export async function requireRole(role: UserRole): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (user.role !== role) {
    // Если пользователь не имеет требуемой роли, редиректим на дашборд
    redirect('/dashboard')
  }

  return user
}

/**
 * Получает скоуп пользователя для RBAC
 * @param user Пользователь
 * @returns Объект с скоупом { role: string, scope: string, company_id?: number }
 */
export async function getUserScope(user: User | null = null): Promise<{
  role: string
  scope: string
  company_id?: number
}> {
  const currentUser = user || await getCurrentUser()

  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const baseScope = {
    role: currentUser.role,
    scope: 'self'
  }

  switch (currentUser.role) {
    case 'admin':
      return {
        ...baseScope,
        scope: 'system'
      }

    case 'owner':
      // Owner имеет скоуп своей компании
      const supabase = await createClient()
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', currentUser.id)
        .single()

      return {
        ...baseScope,
        scope: company?.id?.toString() || 'self',
        company_id: company?.id
      }

    case 'manager':
      // Manager имеет скоуп своей компании
      const supabaseManager = await createClient()
      const { data: manager } = await supabaseManager
        .from('managers')
        .select('company_id')
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .single()

      return {
        ...baseScope,
        scope: manager?.company_id?.toString() || 'self',
        company_id: manager?.company_id
      }

    case 'client':
      // Client имеет скоуп только для своих данных
      return {
        ...baseScope,
        scope: 'self'
      }

    default:
      throw new Error(`Unknown role: ${currentUser.role}`)
  }
}

/**
 * Проверяет, имеет ли пользователь доступ к указанной компании
 * @param user Пользователь
 * @param companyId ID компании
 * @returns true если доступ разрешен
 */
export async function canAccessCompany(user: User, companyId: number): Promise<boolean> {
  const scope = await getUserScope(user)

  // Админ имеет доступ ко всем компаниям
  if (scope.role === 'admin') {
    return true
  }

  // Owner/Manager имеют доступ только к своей компании
  if (scope.role === 'owner' || scope.role === 'manager') {
    return scope.company_id === companyId
  }

  // Client не имеет доступа к компаниям
  return false
}
