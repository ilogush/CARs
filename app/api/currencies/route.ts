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

// Валидация схемы для создания/обновления валюты
const currencySchema = z.object({
    code: z.string().min(3).max(3).transform(val => val.toUpperCase()),
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
    symbol: z.string()
        .min(1, 'Symbol is required')
        .max(10, 'Symbol too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
    is_active: z.boolean().default(true)
})

// GET - список валют
export async function GET(request: NextRequest) {
    const perf = new PerformanceMonitor('GET /api/currencies')
    
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
            .from('currencies')
            .select('id, code, name, symbol, is_active, created_at', { count: 'estimated' })

        if (!showInactive) {
            query = query.eq('is_active', true)
        }

        // Apply filters
        if (params.filters.q) {
            query = query.or(`code.ilike.%${params.filters.q}%,name.ilike.%${params.filters.q}%`)
        }
        
        Object.entries(params.filters).forEach(([key, value]) => {
            if (key !== 'q' && value !== null && value !== undefined) {
                query = query.ilike(key, `%${value}%`)
            }
        })

        // Apply sorting
        const sortBy = params.sortBy || 'code'
        query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

        const from = (params.page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            console.error('Supabase error fetching currencies:', error)
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
        console.error('Internal server error in /api/currencies:', error)
        return createErrorResponse(error as Error, 500)
    }
}

// POST - создание валюты
const POST = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = currencySchema.parse(body)

            const supabase = await createClient()

            // Проверяем уникальность кода
            const { data: existingCurrencyByCode } = await supabase
                .from('currencies')
                .select('id')
                .eq('code', validatedData.code)
                .single()

            if (existingCurrencyByCode) {
                return NextResponse.json(
                    { error: 'Currency with this code already exists' },
                    { status: 400 }
                )
            }

            // Проверяем уникальность названия
            const { data: existingCurrencyByName } = await supabase
                .from('currencies')
                .select('id')
                .eq('name', validatedData.name)
                .single()

            if (existingCurrencyByName) {
                return NextResponse.json(
                    { error: 'Currency with this name already exists' },
                    { status: 400 }
                )
            }

            // Проверяем уникальность символа
            const { data: existingCurrencyBySymbol } = await supabase
                .from('currencies')
                .select('id')
                .eq('symbol', validatedData.symbol)
                .single()

            if (existingCurrencyBySymbol) {
                return NextResponse.json(
                    { error: 'Currency with this symbol already exists' },
                    { status: 400 }
                )
            }

            // Создаем валюту
            const { data, error } = await supabase
                .from('currencies')
                .insert(validatedData)
                .select()
                .single()

            if (error) {
                console.error('Error creating currency:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'currency',
                entity_id: data.id.toString(),
                action: 'create',
                after_state: data
            })

            return NextResponse.json({ data }, { status: 201 })

        } catch (error) {
            console.error('Error in POST /api/currencies:', error)

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
    { resource: 'currencies', action: 'create', scope: 'system' }
)

export { POST }
