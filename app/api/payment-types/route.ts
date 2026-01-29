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

// Валидация схемы для создания/обновления типа платежа
const paymentTypeSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
    sign: z.enum(['+', '-']).refine((val) => val === '+' || val === '-', {
        message: 'Sign must be either + or -'
    }),
    description: z.string()
        .max(500, 'Description too long')
        .refine((val) => !val || /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    is_active: z.boolean().default(true)
})

// GET - список типов платежей
export async function GET(request: NextRequest) {
    const perf = new PerformanceMonitor('GET /api/payment-types')
    
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
            .from('payment_types')
            .select('id, name, sign, description, is_active, created_at', { count: 'estimated' })

        if (!showInactive) {
            query = query.eq('is_active', true)
        }

        // Apply filters
        if (params.filters.q) {
            query = query.or(`name.ilike.%${params.filters.q}%,description.ilike.%${params.filters.q}%`)
        }
        
        if (params.filters.sign) {
            query = query.eq('sign', params.filters.sign)
        }
        
        Object.entries(params.filters).forEach(([key, value]) => {
            if (key !== 'q' && key !== 'sign' && value !== null && value !== undefined) {
                query = query.ilike(key, `%${value}%`)
            }
        })

        // Apply sorting
        const sortBy = params.sortBy || 'sign'
        if (sortBy === 'sign') {
            query = query.order('sign', { ascending: false }).order('name', { ascending: true })
        } else {
            query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })
        }

        const from = (params.page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            console.error('Supabase error fetching payment types:', error)
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
        console.error('Internal server error in /api/payment-types:', error)
        return createErrorResponse(error as Error, 500)
    }
}

// POST - создание типа платежа
const POST = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = paymentTypeSchema.parse(body)

            const supabase = await createClient()

            // Проверяем уникальность названия
            const { data: existingType } = await supabase
                .from('payment_types')
                .select('id')
                .eq('name', validatedData.name)
                .single()

            if (existingType) {
                return NextResponse.json(
                    { error: 'Payment type with this name already exists' },
                    { status: 400 }
                )
            }

            // Создаем тип платежа
            const { data, error } = await supabase
                .from('payment_types')
                .insert(validatedData)
                .select()
                .single()

            if (error) {
                console.error('Error creating payment type:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'payment_type',
                entity_id: data.id.toString(),
                action: 'create',
                after_state: data
            })

            return NextResponse.json({ data }, { status: 201 })

        } catch (error) {
            console.error('Error in POST /api/payment-types:', error)

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
    { resource: 'payment_types', action: 'create', scope: 'system' }
)

export { POST }
