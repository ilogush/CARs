import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserScope } from './auth'

/**
 * RBAC middleware для проверки прав доступа
 * @param request NextRequest
 * @param requiredRoles Требуемые роли (опционально)
 * @param requiredScope Требуемый скоуп (опционально)
 * @param companyId ID компании для проверки (опционально)
 * @returns NextResponse или null если доступ разрешен
 */
export async function rbacCheck(
  request: NextRequest,
  options: {
    requiredRoles?: string[]
    requiredScope?: string
    companyId?: number
    allowSelf?: boolean // для client доступа к своим данным
  } = {}
): Promise<NextResponse | null> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const scope = await getUserScope(user)

    // Проверка роли
    if (options.requiredRoles && !options.requiredRoles.includes(scope.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient role' },
        { status: 403 }
      )
    }

    // Проверка скоупа
    if (options.requiredScope) {
      if (scope.role === 'admin' && options.requiredScope === 'system') {
        // Админ всегда имеет системный скоуп
      } else if (scope.role === 'admin' && options.companyId) {
        // Админ может временно переключаться на скоуп компании
        // Это обрабатывается через query параметр ?company_id=X
        const requestedCompanyId = request.nextUrl.searchParams.get('company_id')
        if (requestedCompanyId && parseInt(requestedCompanyId) === options.companyId) {
          // Админ запрашивает доступ к конкретной компании
        } else {
          return NextResponse.json(
            { error: 'Forbidden: Admin must specify company_id parameter' },
            { status: 403 }
          )
        }
      } else if (scope.company_id && scope.company_id === options.companyId) {
        // Owner/Manager имеет доступ к своей компании
      } else if (options.allowSelf && scope.scope === 'self') {
        // Client имеет доступ к своим данным
      } else {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient scope' },
          { status: 403 }
        )
      }
    }

    // Добавляем информацию о пользователе и скоупе в заголовки для использования в API
    const response = NextResponse.next()
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-role', scope.role)
    response.headers.set('x-user-scope', scope.scope)
    if (scope.company_id) {
      response.headers.set('x-company-id', scope.company_id.toString())
    }

    return null // Доступ разрешен

  } catch (error) {
    console.error('RBAC check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Вспомогательная функция для проверки прав доступа в API routes
 * @param request NextRequest
 * @param requiredRoles Требуемые роли
 * @param companyId ID компании для проверки
 * @returns Объект с информацией о пользователе и скоупе
 */
export async function checkPermissions(
  request: NextRequest,
  requiredRoles?: string[],
  companyId?: number
): Promise<{
  user: any
  scope: any
  isAdminMode: boolean
}> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  const scope = await getUserScope(user)
  
  // Проверка роли
  if (requiredRoles && !requiredRoles.includes(scope.role)) {
    throw new Error('Forbidden: Insufficient role')
  }

  // Проверка доступа к компании
  if (companyId) {
    if (scope.role === 'admin') {
      // Админ может получить доступ к любой компании через company_id параметр
      const requestedCompanyId = request.nextUrl.searchParams.get('company_id')
      if (!requestedCompanyId || parseInt(requestedCompanyId) !== companyId) {
        throw new Error('Forbidden: Admin must specify correct company_id parameter')
      }
    } else if (scope.company_id !== companyId) {
      throw new Error('Forbidden: Cannot access this company')
    }
  }

  return {
    user,
    scope,
    isAdminMode: scope.role === 'admin' && !!request.nextUrl.searchParams.get('company_id')
  }
}
