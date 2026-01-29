import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export interface AuditLogData {
    entity_type: string
    entity_id: string
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'login_failed' | 'correct' | 'view'
    before_state?: Record<string, any>
    after_state?: Record<string, any>
    company_id?: number
}

/**
 * Логирует действие пользователя в audit_logs
 */
export async function logAuditAction(
    request: NextRequest,
    auditData: AuditLogData
): Promise<void> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return
        }

        // Получаем данные пользователя
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return
        }

        // Получаем IP и User Agent
        const forwardedFor = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'

        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Используем серверный клиент с service role для обхода RLS
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Определяем company_id если не указан
        let companyId = auditData.company_id
        
        // Если админ в режиме Owner, получаем company_id из параметров запроса
        if (!companyId && userData.role === 'admin') {
            const url = new URL(request.url)
            const adminCompanyId = url.searchParams.get('company_id')
            if (adminCompanyId) {
                companyId = parseInt(adminCompanyId)
            }
        }
        
        // Для owner/manager получаем company_id из их связи
        if (!companyId && (userData.role === 'owner' || userData.role === 'manager')) {
            const { data: companyData } = await supabaseAdmin
                .from(userData.role === 'owner' ? 'companies' : 'managers')
                .select('company_id')
                .eq(userData.role === 'owner' ? 'owner_id' : 'user_id', user.id)
                .single()

            companyId = companyData?.company_id
        }

        // Создаем запись в audit_logs
        const { error: insertError } = await supabaseAdmin
            .from('audit_logs')
            .insert({
                user_id: user.id,
                role: userData.role,
                company_id: companyId,
                entity_type: auditData.entity_type,
                entity_id: auditData.entity_id,
                action: auditData.action,
                before_state: auditData.before_state || null,
                after_state: auditData.after_state || null,
                ip,
                user_agent: userAgent
            })

        if (insertError) {
            console.error('Error inserting audit log:', insertError)
            // Не прерываем выполнение основной логики при ошибке логирования
        }

    } catch (error) {
        console.error('Error logging audit action:', error)
        // Не прерываем выполнение основной логики при ошибке логирования
    }
}

/**
 * Middleware для автоматического логирования API запросов
 */
export function withAuditLogging(
    handler: (request: NextRequest) => Promise<Response>,
    auditData: Omit<AuditLogData, 'entity_id'>
) {
    return async (request: NextRequest): Promise<Response> => {
        const startTime = Date.now()

        try {
            const response = await handler(request)

            // Извлекаем entity_id из ответа или URL
            let entityId = 'unknown'

            if (response instanceof Response) {
                try {
                    const clonedResponse = response.clone()
                    const responseData = await clonedResponse.json()
                    entityId = responseData.id || responseData.data?.[0]?.id || entityId
                } catch {
                    // Если не удалось распарсить JSON, пробуем извлечь из URL
                    const url = new URL(request.url)
                    const pathParts = url.pathname.split('/')
                    entityId = pathParts[pathParts.length - 1] || entityId
                }
            }

            // Логируем только успешные операции
            if (response.status < 400) {
                await logAuditAction(request, {
                    ...auditData,
                    entity_id: entityId
                })
            }

            return response
        } catch (error) {
            console.error('Error in audit logging middleware:', error)
            throw error
        }
    }
}

/**
 * Логирует вход пользователя в систему
 */
export async function logUserLogin(request: NextRequest, userId: string): Promise<void> {
    try {
        // Используем серверный клиент с service role для обхода RLS
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Получаем данные пользователя
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role, email')
            .eq('id', userId)
            .single()

        if (!userData) {
            return
        }

        // Определяем company_id
        let companyId = null
        if (userData.role === 'owner' || userData.role === 'manager') {
            const { data: companyData } = await supabaseAdmin
                .from(userData.role === 'owner' ? 'companies' : 'managers')
                .select('company_id')
                .eq(userData.role === 'owner' ? 'owner_id' : 'user_id', userId)
                .single()

            companyId = companyData?.company_id
        }

        // Получаем IP и User Agent
        const forwardedFor = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'

        const userAgent = request.headers.get('user-agent') || 'unknown'

        const { error: insertError } = await supabaseAdmin
            .from('audit_logs')
            .insert({
                user_id: userId,
                role: userData.role,
                company_id: companyId,
                entity_type: 'user',
                entity_id: userId,
                action: 'login',
                before_state: null,
                after_state: {
                    email: userData.email,
                    login_time: new Date().toISOString()
                },
                ip,
                user_agent: userAgent
            })

        if (insertError) {
            console.error('Error inserting login audit log:', insertError)
        }

    } catch (error) {
        console.error('Error logging user login:', error)
    }
}

/**
 * Логирует вход админа в компанию
 */
export async function logAdminCompanyAccess(
    request: NextRequest,
    adminId: string,
    companyId: number
): Promise<void> {
    try {
        const supabase = await createClient()

        // Получаем данные компании
        const { data: companyData } = await supabase
            .from('companies')
            .select('name, location_id')
            .eq('id', companyId)
            .single()

        if (!companyData) {
            return
        }

        // Получаем IP и User Agent
        const forwardedFor = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'

        const userAgent = request.headers.get('user-agent') || 'unknown'

        await supabase
            .from('audit_logs')
            .insert({
                user_id: adminId,
                role: 'admin',
                company_id: companyId,
                entity_type: 'company',
                entity_id: companyId.toString(),
                action: 'login',
                before_state: null,
                after_state: {
                    admin_access: true,
                    company_name: companyData.name,
                    location_id: companyData.location_id,
                    access_time: new Date().toISOString()
                },
                ip,
                user_agent: userAgent
            })

    } catch (error) {
        console.error('Error logging admin company access:', error)
    }
}
