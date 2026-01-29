import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { 
  parsePaginationParams,
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG, 
  PerformanceMonitor 
} from '@/lib/api/performance'

export async function GET(request: NextRequest) {
    const perf = new PerformanceMonitor('GET /api/hotels')
    
    try {
        const params = parsePaginationParams(request.nextUrl.searchParams)
        const pageSize = Math.min(params.pageSize, 100)
        const locationId = request.nextUrl.searchParams.get('location_id')
        const search = request.nextUrl.searchParams.get('search')

        const supabase = await createClient()

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let query = supabaseAdmin
            .from('hotels')
            .select(`
        id, name, location_id, district_id, is_active, created_at,
        districts(name),
        locations(name)
      `, { count: 'estimated' })
            .eq('is_active', true)

        if (locationId) {
            query = query.eq('location_id', locationId)
        }

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        // Sort by name
        query = query.order('name')

        const from = (params.page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            console.error('Error fetching hotels:', error)
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
        console.error('Internal error in GET /api/hotels:', error)
        return createErrorResponse(error as Error, 500)
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const supabase = await createClient()

        // Check auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data, error } = await supabaseAdmin
            .from('hotels')
            .insert({
                ...body,
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating hotel:', error)
            return Response.json({ error: error.message }, { status: 500 })
        }

        // Audit Log
        try {
            const { logAuditAction } = await import('@/lib/audit-middleware')
            await logAuditAction(request, {
                entity_type: 'hotel',
                entity_id: data.id.toString(),
                action: 'create',
                after_state: data
            })
        } catch (auditError) {
            console.error('Failed to log audit action:', auditError)
        }

        return Response.json(data)
    } catch (error) {
        console.error('Internal error in POST /api/hotels:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
