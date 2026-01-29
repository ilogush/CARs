import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'
import { 
  parsePaginationParams,
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG, 
  PerformanceMonitor 
} from '@/lib/api/performance'

// Валидация схемы для создания/обновления статуса платежа
const paymentStatusSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
    value: z.number().int().refine(val => [-1, 0, 1].includes(val), {
        message: 'Value must be -1 (refund), 0 (pending), or 1 (payment)'
    }),
    description: z.string()
        .max(500, 'Description too long')
        .refine((val) => !val || /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    is_active: z.boolean().default(true)
})

// GET - список статусов платежей
export async function GET(request: NextRequest) {
    const perf = new PerformanceMonitor('GET /api/payment-statuses')
    
    try {
        const params = parsePaginationParams(request.nextUrl.searchParams)
        const pageSize = Math.min(params.pageSize, 100)
        const showInactive = request.nextUrl.searchParams.get('showInactive') === 'true'

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return createErrorResponse(new Error('Unauthorized'), 401)
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let query = supabaseAdmin
            .from('payment_statuses')
            .select('id, name, value, description, is_active, created_at', { count: 'estimated' })

        if (!showInactive) {
            query = query.eq('is_active', true)
        }

        // Apply filters
        if (params.filters.q) {
            query = query.or(`name.ilike.%${params.filters.q}%,description.ilike.%${params.filters.q}%`)
        }
        
        if (params.filters.value !== undefined) {
            const val = typeof params.filters.value === 'string' ? parseInt(params.filters.value) : params.filters.value
            query = query.eq('value', val)
        }
        
        Object.entries(params.filters).forEach(([key, value]) => {
            if (key !== 'q' && key !== 'value' && value !== null && value !== undefined) {
                query = query.ilike(key, `%${value}%`)
            }
        })

        // Apply sorting
        const sortBy = params.sortBy || 'value'
        if (sortBy === 'value') {
            query = query.order('value', { ascending: false }).order('name', { ascending: true })
        } else {
            query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })
        }

        const from = (params.page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            console.error('Supabase error fetching payment statuses:', error)
            return createErrorResponse(error, 500)
        }

        perf.end()

        return createCachedResponse(
            {
                data: data || [],
                totalCount: count || 0
            },
            CACHE_CONFIG.REFERENCE_DATA
        )

    } catch (error) {
        console.error('Internal server error in /api/payment-statuses:', error)
        return createErrorResponse(error as Error, 500)
    }
}

// POST - создание статуса платежа
const POST = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = paymentStatusSchema.parse(body)

            const supabase = await createClient()

            // Проверяем уникальность названия
            const { data: existingStatus } = await supabase
                .from('payment_statuses')
                .select('id')
                .eq('name', validatedData.name)
                .single()

            if (existingStatus) {
                return NextResponse.json(
                    { error: 'Payment status with this name already exists' },
                    { status: 400 }
                )
            }

            // Создаем статус платежа
            const { data, error } = await supabase
                .from('payment_statuses')
                .insert(validatedData)
                .select()
                .single()

            if (error) {
                console.error('Error creating payment status:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'payment_status',
                entity_id: data.id.toString(),
                action: 'create',
                after_state: data
            })

            return NextResponse.json({ data }, { status: 201 })

        } catch (error) {
            console.error('Error in POST /api/payment-statuses:', error)

            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    { error: 'Validation failed', details: error.issues },
                    { status: 400 }
                )
            }

            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'payment_statuses', action: 'create', scope: 'system' }
)

export { POST }
