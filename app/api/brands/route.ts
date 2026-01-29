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
  const perf = new PerformanceMonitor('GET /api/brands')
  
  try {
    const brandOnlyModelValue = '__brand__'
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    // Check permissions
    await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabase = await createClient()

    let query = supabase
      .from('car_brand_models')
      .select('id, brand, model, created_at', { count: 'estimated' })
      .neq('model', brandOnlyModelValue)

    // Apply filters
    if (params.filters.q) {
      query = query.or(`brand.ilike.%${params.filters.q}%,model.ilike.%${params.filters.q}%`)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'brand'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching brands:', error)
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

  } catch (error: any) {
    console.error('Internal server error in /api/brands:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return createErrorResponse(error, error.message.includes('Unauthorized') ? 401 : 403)
    }
    return createErrorResponse(error, 500)
  }
}
