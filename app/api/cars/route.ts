import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPermissions } from '@/lib/rbac-middleware'
import { 
  parsePaginationParams, 
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG,
  PerformanceMonitor
} from '@/lib/api/performance'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/cars')
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    // Check permissions - only admin, owner, manager can view cars
    await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabase = await createClient()

    // Build optimized query - RLS handles filtering by company
    let query = supabase
      .from('car_items')
      .select('id, license_plate, color, description, status, created_at, brand_model_id, company_id, car_brand_models(brand, model), companies(name)', { count: 'estimated' })

    // Apply filters
    if (params.filters.q) {
      const val = params.filters.q as string

      // Find matching brand/model IDs first to use in filter
      const { data: brandModels } = await supabase
        .from('car_brand_models')
        .select('id')
        .or(`brand.ilike.%${val}%,model.ilike.%${val}%`)

      const brandModelIds = brandModels?.map((bm: any) => bm.id) || []

      let orClause = `color.ilike.%${val}%,description.ilike.%${val}%,license_plate.ilike.%${val}%`

      if (brandModelIds.length > 0) {
        orClause += `,brand_model_id.in.(${brandModelIds.join(',')})`
      }

      query = query.or(orClause)
    }

    // Apply attribute filters
    Object.entries(params.filters).forEach(([key, value]) => {
      if (key !== 'q' && value && typeof value === 'string') {
        query = query.ilike(key, `%${value}%`)
      }
    })

    // Apply sorting
    const sortBy = params.sortBy || 'created_at'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    // Apply pagination
    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching cars:', error)
      return createErrorResponse(error, 500)
    }

    perf.end()

    return createCachedResponse(
      {
        data: data || [],
        totalCount: count || 0
      },
      CACHE_CONFIG.DYNAMIC_DATA
    )

  } catch (error: any) {
    console.error('Internal server error in GET /api/cars:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return createErrorResponse(error, error.message.includes('Unauthorized') ? 401 : 403)
    }
    return createErrorResponse(error, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only admins, owners, and managers can create cars
    const { user } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const body = await request.json()
    const supabase = await createClient()

    // Insert car - RLS handles permission check (e.g. if user belongs to the company_id in the body)
    const { data, error } = await supabase
      .from('car_items')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('Error inserting car:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    try {
      const { logAuditAction } = await import('@/lib/audit-middleware')
      const companyId = data.company_id || undefined
      await logAuditAction(request, {
        entity_type: 'car',
        entity_id: data.id.toString(),
        action: 'create',
        after_state: data,
        company_id: companyId
      })
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return Response.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Internal server error in POST /api/cars:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
