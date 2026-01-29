import { NextRequest, NextResponse } from 'next/server'
import { checkPermissions } from '@/lib/rbac-middleware'
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


export const dynamic = 'force-dynamic'


// Валидация схемы для создания/обновления района
const districtSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
  location_id: z.number().int().positive('Location ID must be a positive integer'),
  price_per_day: z.number().nonnegative('Price must be non-negative').optional().nullable(),
  is_active: z.boolean().optional().nullable()
})

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/districts')
  
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)
    const locationId = request.nextUrl.searchParams.get('locationId')

    // Kick off Auth Check
    const supabase = await createClient()
    const authPromise = supabase.auth.getUser()

    // Kick off Data Query (using Service Role)
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabaseAdmin
      .from('districts')
      .select(`
  id, name, location_id, price_per_day, is_active, created_at,
  locations(
    id,
    name
  )
    `, { count: 'estimated' })

    // Apply filters
    if (locationId) {
      query = query.eq('location_id', parseInt(locationId))
    }

    if (params.filters.q) {
      query = query.ilike('name', `%${params.filters.q}%`)
    }
    
    if (params.filters.location_id) {
      const locId = typeof params.filters.location_id === 'string' ? parseInt(params.filters.location_id) : params.filters.location_id
      query = query.eq('location_id', locId)
    }
    
    Object.entries(params.filters).forEach(([key, value]) => {
      if (key !== 'q' && key !== 'location_id' && value !== null && value !== undefined) {
        query = query.ilike(key, `%${value}%`)
      }
    })

    // Apply sorting
    const sortBy = params.sortBy || 'name'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    // Await both in parallel
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
      console.error('Supabase error fetching districts:', error)
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
    console.error('Internal server error in /api/districts:', error)
    return createErrorResponse(error as Error, 500)
  }
}

// POST - создание района
const POST = withAuth(
  async (request: NextRequest, context: any): Promise<NextResponse> => {
    try {
      const body = await request.json()

      // Валидация данных
      const validatedData = districtSchema.parse(body)

      const supabase = await createClient()

      // Проверяем существование локации
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('id', validatedData.location_id)
        .single()

      if (!location) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 400 }
        )
      }

      // Проверяем уникальность названия в рамках локации
      const { data: existingDistrict } = await supabase
        .from('districts')
        .select('id')
        .eq('name', validatedData.name)
        .eq('location_id', validatedData.location_id)
        .single()

      if (existingDistrict) {
        return NextResponse.json(
          { error: 'District with this name already exists in this location' },
          { status: 400 }
        )
      }

      // Создаем район
      const { data, error } = await supabase
        .from('districts')
        .insert(validatedData)
        .select(`
  *,
  locations(
    id,
    name
  )
    `)
        .single()

      if (error) {
        console.error('Error creating district:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      // Логируем действие
      await (await import('@/lib/audit-middleware')).logAuditAction(request, {
        entity_type: 'district',
        entity_id: data.id.toString(),
        action: 'create',
        after_state: data
      })

      updateTag(CACHE_TAGS.DISTRICTS)
      updateTag(CACHE_TAGS.DASHBOARD_STATS)

      return NextResponse.json({ data }, { status: 201 })

    } catch (error) {
      console.error('Error in POST /api/districts:', error)

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
  { resource: 'districts', action: 'create', scope: 'system' }
)

export { POST }
