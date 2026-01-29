import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export interface AuthContext {
    user: {
        id: string
        email: string
        role: 'admin' | 'owner' | 'manager' | 'client'
    }
    scope: {
        type: 'system' | 'company' | 'self'
        company_id?: number
    }
}

export interface Permission {
    resource: string
    action: 'create' | 'read' | 'update' | 'delete'
    scope?: 'system' | 'company' | 'self'
}

/**
 * Проверяет права доступа пользователя
 * 
 * @param request NextRequest объект
 * @param permission Требуемое разрешение
 * @returns AuthContext или null если нет доступа
 */
export async function checkPermission(
    request: NextRequest,
    permission: Permission
): Promise<AuthContext | null> {
    try {
        if (process.env.NODE_ENV !== 'production') {
            logger.debug('Checking permission', {
                permission,
                url: request.url,
                method: request.method
            })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
            logger.error('Auth error', authError)
            return null
        }

        if (!user) {
            logger.warn('No user found')
            return null
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.debug('User found', { id: user.id, email: user.email })
        }

        // Получаем данные пользователя из public.users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', user.id)
            .single()

        if (userError) {
            logger.error('User data error', userError)
            return null
        }

        if (!userData) {
            logger.warn('User data not found')
            return null
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.debug('User data loaded', { role: userData.role })
        }

        const authContext: AuthContext = {
            user: {
                id: userData.id,
                email: userData.email,
                role: userData.role as 'admin' | 'owner' | 'manager' | 'client'
            },
            scope: {
                type: userData.role === 'admin' ? 'system' : 'self'
            }
        }

        // Определяем scope для owner/manager
        if (userData.role === 'owner' || userData.role === 'manager') {
            const { data: companyData } = await supabase
                .from(userData.role === 'owner' ? 'companies' : 'managers')
                .select('company_id')
                .eq(userData.role === 'owner' ? 'owner_id' : 'user_id', userData.id)
                .single()

            if (companyData) {
                authContext.scope = {
                    type: 'company',
                    company_id: companyData.company_id
                }
            }
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.debug('Auth context created', { scope: authContext.scope })
        }

        // Проверяем права доступа
        if (!hasPermission(authContext, permission)) {
            logger.warn('Permission denied', { 
                role: authContext.user.role,
                permission: permission.action
            })
            return null
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.debug('Permission granted')
        }
        return authContext
    } catch (error) {
        logger.error('Error checking permission', error)
        return null
    }
}

/**
 * Проверяет имеет ли пользователь указанное разрешение
 */
function hasPermission(authContext: AuthContext, permission: Permission): boolean {
    const { user, scope } = authContext

    // Админ имеет все права в system scope
    if (user.role === 'admin') {
        return true
    }

    // Для owner и manager проверяем scope
    if (user.role === 'owner' || user.role === 'manager') {
        if (permission.scope === 'system') {
            return false
        }

        if (permission.scope === 'company' || !permission.scope) {
            return scope.type === 'company'
        }

        if (permission.scope === 'self') {
            return scope.type === 'self'
        }
    }

    // Client имеет права только на свои данные
    if (user.role === 'client') {
        return permission.scope === 'self' && scope.type === 'self'
    }

    return false
}

/**
 * Middleware для проверки прав доступа в API routes
 * Поддерживает API routes с params (например /api/resource/[id])
 */
export function withAuth(
    handler: (request: NextRequest, context: AuthContext & { params?: Promise<{ [key: string]: string }> }) => Promise<NextResponse>,
    permission: Permission
) {
    return async (request: NextRequest, context: { params?: Promise<{ [key: string]: string }> }): Promise<NextResponse> => {
        if (process.env.NODE_ENV !== 'production') {
            logger.debug('withAuth middleware called', {
                url: request.url,
                method: request.method,
                permission: permission.action
            })
        }

        const authContext = await checkPermission(request, permission)

        if (!authContext) {
            logger.warn('Auth failed - returning 401')
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.debug('Auth succeeded - calling handler')
        }

        try {
            // Объединяем authContext с params для поддержки динамических маршрутов
            const fullContext = {
                ...authContext,
                params: context.params
            }
            return await handler(request, fullContext)
        } catch (error) {
            logger.error('Error in protected handler', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    }
}

/**
 * Получает контекст авторизации для серверных компонентов
 */
export async function getAuthContext(): Promise<AuthContext | null> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return null
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', user.id)
            .single()

        if (userError || !userData) {
            return null
        }

        const authContext: AuthContext = {
            user: {
                id: userData.id,
                email: userData.email,
                role: userData.role as 'admin' | 'owner' | 'manager' | 'client'
            },
            scope: {
                type: userData.role === 'admin' ? 'system' : 'self'
            }
        }

        // Определяем scope для owner/manager
        if (userData.role === 'owner' || userData.role === 'manager') {
            const { data: companyData } = await supabase
                .from(userData.role === 'owner' ? 'companies' : 'managers')
                .select('company_id')
                .eq(userData.role === 'owner' ? 'owner_id' : 'user_id', userData.id)
                .single()

            if (companyData) {
                authContext.scope = {
                    type: 'company',
                    company_id: companyData.company_id
                }
            }
        }

        return authContext
    } catch (error) {
        console.error('Error getting auth context:', error)
        return null
    }
}

/**
 * Проверяет является ли пользователь админом
 */
export async function isAdmin(): Promise<boolean> {
    const authContext = await getAuthContext()
    return authContext?.user.role === 'admin'
}

/**
 * Проверяет имеет ли пользователь доступ к компании
 */
export async function hasCompanyAccess(companyId: number): Promise<boolean> {
    const authContext = await getAuthContext()

    if (!authContext) {
        return false
    }

    if (authContext.user.role === 'admin') {
        return true
    }

    if (authContext.user.role === 'owner' || authContext.user.role === 'manager') {
        return authContext.scope.type === 'company' && authContext.scope.company_id === companyId
    }

    return false
}

/**
 * Создает Supabase клиент с нужными правами доступа
 */
export async function createAuthClient(authContext: AuthContext) {
    const supabase = await createClient()

    // Для админов используем service role для полного доступа
    if (authContext.user.role === 'admin') {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        return createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
    }

    return supabase
}
