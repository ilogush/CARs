import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { 
  parsePaginationParams, 
  createCachedResponse, 
  CACHE_CONFIG,
  PerformanceMonitor
} from '@/lib/api/performance'

export const dynamic = 'force-dynamic'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/bookings')
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    const { user, scope } = await checkPermissions(request, ['admin', 'owner', 'manager'])

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id for filtering
    let targetCompanyId: number | null = null
    const adminCompanyId = await getAdminModeCompanyId(request)

    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    }

    // Build optimized select query with minimal fields
    const selectQuery = `
      id, client_id, company_car_id, start_date, end_date, total_amount, status, created_at,
      company_cars!inner(
        id, company_id, license_plate,
        car_templates(car_brands(name), car_models(name))
      ),
      client:users!inner(name, surname)
    `

    let query = supabaseAdmin
      .from('bookings')
      .select(selectQuery, { count: 'estimated' })

    // Apply company filter using !inner join
    if (targetCompanyId !== null) {
      query = query.eq('company_cars.company_id', targetCompanyId)
    }

    // Only show pending bookings for managers
    if (scope.role === 'manager') {
      query = query.eq('status', 'pending')
    }

    // Apply search filter
    if (params.filters.q) {
      const val = params.filters.q as string
      query = query.or(`status.ilike.%${val}%,client.name.ilike.%${val}%,client.surname.ilike.%${val}%,company_cars.license_plate.ilike.%${val}%`)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Error fetching bookings:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    perf.end()

    return createCachedResponse(
      {
        data: data || [],
        totalCount: count || 0
      },
      CACHE_CONFIG.USER_DATA
    )

  } catch (error: any) {
    console.error('Error in /api/bookings:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, scope } = await checkPermissions(request, ['client', 'owner', 'manager', 'admin'])

    const body = await request.json()
    const { client_id, company_car_id, start_date, end_date, notes } = body

    if (!company_car_id || !start_date || !end_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine client_id
    let targetClientId: string
    if (scope.role === 'client') {
      targetClientId = user.id
    } else {
      if (!client_id) {
        return Response.json({ error: 'Client ID is required' }, { status: 400 })
      }
      targetClientId = client_id
    }

    // Get car and calculate total
    const { data: car, error: carError } = await supabaseAdmin
      .from('company_cars')
      .select('company_id, price_per_day')
      .eq('id', company_car_id)
      .single()

    if (carError || !car) {
      return Response.json({ error: 'Car not found' }, { status: 404 })
    }

    // Calculate total amount
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const total_amount = days * car.price_per_day

    // Create booking
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        client_id: targetClientId,
        company_car_id,
        start_date,
        end_date,
        total_amount,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    try {
      const { logAuditAction } = await import('@/lib/audit-middleware')
      await logAuditAction(request, {
        entity_type: 'booking',
        entity_id: data.id.toString(),
        action: 'create',
        after_state: data
      })
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return Response.json(data, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/bookings:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
