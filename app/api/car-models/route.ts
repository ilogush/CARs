import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
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

// Валидация схемы для создания/обновления модели
const carModelSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
    brand_id: z.number().int().positive('Brand ID must be a positive integer')
})

// GET - список моделей
async function GET(request: NextRequest) {
    const perf = new PerformanceMonitor('GET /api/car-models')
    
    try {
        const params = parsePaginationParams(request.nextUrl.searchParams)
        const pageSize = Math.min(params.pageSize, 100)

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
            .from('car_models')
            .select(`
        id, name, brand_id, created_at,
        car_brands (id, name)
      `, { count: 'estimated' })
            .is('deleted_at', null)

        // Apply filters
        if (params.filters.q) {
            query = query.ilike('name', `%${params.filters.q}%`)
        }
        
        if (params.filters.brand_id) {
            const brandId = typeof params.filters.brand_id === 'string' ? parseInt(params.filters.brand_id) : params.filters.brand_id
            query = query.eq('brand_id', brandId)
        }
        
        Object.entries(params.filters).forEach(([key, value]) => {
            if (key !== 'q' && key !== 'brand_id' && value !== null && value !== undefined) {
                query = query.ilike(key, `%${value}%`)
            }
        })

        // Apply sorting
        const sortBy = params.sortBy || 'name'
        query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

        // Apply pagination
        const from = (params.page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            const { formatErrorMessage } = await import('@/lib/error-handler')
            return createErrorResponse(new Error(formatErrorMessage(error)), 500)
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
        const { formatErrorMessage } = await import('@/lib/error-handler')
        return createErrorResponse(new Error(formatErrorMessage(error)), 500)
    }
}

// POST - создание модели
const POST = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = carModelSchema.parse(body)

            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            // Создаем модель через RPC (атомарно с аудитом и проверкой уникальности)
            const { data, error } = await supabase.rpc('create_car_model', {
                p_brand_id: validatedData.brand_id,
                p_name: validatedData.name,
                p_user_id: user.id,
                p_audit_metadata: {
                    ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
                    user_agent: request.headers.get('user-agent') || 'unknown'
                }
            })

            if (error) {
                const { formatErrorMessage } = await import('@/lib/error-handler')
                return NextResponse.json(
                    { error: formatErrorMessage(error) },
                    { status: (error.code === '23505') ? 400 : 500 }
                )
            }

            return NextResponse.json({ data }, { status: 201 })

        } catch (error) {
            const { formatErrorMessage } = await import('@/lib/error-handler')

            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    { error: 'Validation failed', details: error.issues },
                    { status: 400 }
                )
            }

            return NextResponse.json(
                { error: formatErrorMessage(error) },
                { status: 500 }
            )
        }
    },
    { resource: 'car_models', action: 'create', scope: 'system' }
)

export { GET, POST }
