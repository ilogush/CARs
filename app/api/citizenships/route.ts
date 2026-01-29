import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG, 
  PerformanceMonitor 
} from '@/lib/api/performance'

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/citizenships')
  
  try {
    const supabase = await createClient()
    const search = request.nextUrl.searchParams.get('search') || ''

    let query = supabase
      .from('citizenships')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (search) {
      query = query.ilike('name', `${search}%`)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('Error fetching citizenships:', error)
      return createErrorResponse(error, 500)
    }

    perf.end()

    return createCachedResponse({ data }, CACHE_CONFIG.REFERENCE_DATA)
  } catch (error) {
    console.error('Internal server error:', error)
    return createErrorResponse(error as Error, 500)
  }
}
