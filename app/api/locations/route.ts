import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'
import { updateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { 
  parsePaginationParams,
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG, 
  PerformanceMonitor 
} from '@/lib/api/performance'


// Валидация схемы для создания/обновления локации
const locationSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
})

export const revalidate = 300 // 5 minutes

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/locations')
  
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    const supabase = await createClient()
    const authPromise = supabase.auth.getUser()

    // Initialize admin client to bypass RLS recursion issues
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabaseAdmin
      .from('locations')
      .select('id, name, created_at', { count: 'estimated' })

    // Apply filters
    if (params.filters.q) {
      query = query.ilike('name', `%${params.filters.q}%`)
    }
    
    Object.entries(params.filters).forEach(([key, value]) => {
      if (key !== 'q' && value && typeof value === 'string') {
        query = query.ilike(key, `%${value}%`)
      }
    })

    // Apply sorting
    const sortBy = params.sortBy || 'name'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    // Apply pagination
    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const [authResult, dataResult] = await Promise.all([
      authPromise,
      query.range(from, to)
    ])

    const { data: { user }, error: authError } = authResult
    const { data, count, error } = dataResult

    if (authError || !user) {
      return createErrorResponse(new Error('Unauthorized'), 401)
    }

    if (error) {
      console.error('Supabase error fetching locations:', error)
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
    console.error('Internal server error in /api/locations:', error)
    return createErrorResponse(error as Error, 500)
  }
}

// POST - создание локации
const POST = withAuth(
  async (request: NextRequest, context: any): Promise<NextResponse> => {
    try {
      const body = await request.json()

      // Валидация данных
      const validatedData = locationSchema.parse(body)

      const supabase = await createClient()

      // Проверяем уникальность названия
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('name', validatedData.name)
        .single()

      if (existingLocation) {
        return NextResponse.json(
          { error: 'Location with this name already exists' },
          { status: 400 }
        )
      }

      // Создаем локацию
      const { data, error } = await supabase
        .from('locations')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        console.error('Error creating location:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      // Логируем действие
      await (await import('@/lib/audit-middleware')).logAuditAction(request, {
        entity_type: 'location',
        entity_id: data.id.toString(),
        action: 'create',
        after_state: data
      })

      updateTag(CACHE_TAGS.LOCATIONS)
      updateTag(CACHE_TAGS.DASHBOARD_STATS)

      return NextResponse.json({ data }, { status: 201 })

    } catch (error) {
      console.error('Error in POST /api/locations:', error)

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
  { resource: 'locations', action: 'create', scope: 'system' }
)

export { POST }
