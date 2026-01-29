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

// Валидация схемы для создания/обновления цвета
const colorSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
  hex_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex code format (use #RRGGBB)')
})

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/colors')
  
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

    // Check if table exists
    const { error: checkError } = await supabaseAdmin.from('car_colors').select('id').limit(1)
    if (checkError && checkError.code === '42P01') {
      console.warn('Colors table missing')
      return Response.json({ data: [], totalCount: 0 })
    }

    let query = supabaseAdmin
      .from('car_colors')
      .select('id, name, hex_code, created_at', { count: 'estimated' })

    // Apply filters
    if (params.filters.q) {
      query = query.ilike('name', `%${params.filters.q}%`)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'name'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching colors:', error)
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
    console.error('Internal server error in /api/colors:', error)
    return createErrorResponse(error as Error, 500)
  }
}

// POST - создание цвета
const POST = withAuth(
  async (request: NextRequest, context: any): Promise<NextResponse> => {
    try {
      const body = await request.json()

      // Валидация данных
      const validatedData = colorSchema.parse(body)

      const supabase = await createClient()

      // Проверяем уникальность названия
      const { data: existingColor } = await supabase
        .from('car_colors')
        .select('id')
        .eq('name', validatedData.name)
        .single()

      if (existingColor) {
        return NextResponse.json(
          { error: 'Color with this name already exists' },
          { status: 400 }
        )
      }

      // Создаем цвет
      const { data, error } = await supabase
        .from('car_colors')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        console.error('Error creating color:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      // Логируем действие
      await (await import('@/lib/audit-middleware')).logAuditAction(request, {
        entity_type: 'color',
        entity_id: data.id.toString(),
        action: 'create',
        after_state: data
      })

      return NextResponse.json({ data }, { status: 201 })

    } catch (error) {
      console.error('Error in POST /api/colors:', error)

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
  { resource: 'colors', action: 'create', scope: 'system' }
)

export { POST }
