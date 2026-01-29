import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { 
  parsePaginationParams, 
  createCachedResponse, 
  CACHE_CONFIG,
  PerformanceMonitor
} from '@/lib/api/performance'

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/companies')
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching user role:', userError)
      return Response.json({ error: 'Failed to fetch user role', details: userError.message }, { status: 500 })
    }

    // Optimized query with relations and counts - select only necessary fields
    let query = supabaseAdmin
      .from('companies')
      .select(`
        id, name, owner_id, location_id, created_at,
        owner:users!owner_id(id, name, surname, email),
        locations(name, districts(name)),
        company_cars(count),
        managers(count)
      `, { count: 'estimated' })

    if (userData?.role === 'owner') {
      query = query.eq('owner_id', user.id)
    } else if (userData?.role === 'manager') {
      const { data: managerData } = await supabaseAdmin
        .from('managers')
        .select('company_id')
        .eq('user_id', user.id)

      const companyIds = managerData?.map(m => m.company_id) || []
      query = query.in('id', companyIds)
    }

    if (params.filters.q) {
      query = query.ilike('name', `%${params.filters.q}%`)
    }
    
    Object.entries(params.filters).forEach(([key, value]) => {
      if (key !== 'q' && value) {
        if (key === 'owner_id' || key === 'id' || key === 'location_id') {
          query = query.eq(key, value)
        } else {
          query = query.ilike(key, `%${value}%`)
        }
      }
    })

    const sortBy = params.sortBy || 'name'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: companies, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching companies:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Transform data to match expected frontend structure
    const enrichedData = companies?.map((company: any) => ({
      ...company,
      _stats: {
        carsCount: company.company_cars?.[0]?.count || 0,
        managersCount: company.managers?.[0]?.count || 0,
        districtName: company.locations?.districts?.[0]?.name || null
      }
    }))

    perf.end()

    return createCachedResponse(
      {
        data: enrichedData || [],
        totalCount: count || 0
      },
      CACHE_CONFIG.USER_DATA
    )

  } catch (error) {
    console.error('Internal server error in /api/companies:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Allow Admins and Owners to create companies
    if (!['admin', 'owner'].includes(userData?.role || '')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If owner, force owner_id to self
    if (userData?.role === 'owner') {
      body.owner_id = user.id
    }
    // If admin, body.owner_id can be passed, or default to current user? 
    // Usually admin creates company for an owner.
    // For now, if owner_id not provided, use current user.
    if (!body.owner_id) {
      body.owner_id = user.id
    }

    // Validate company name (Latin only for admin panel)
    if (body.name) {
      const trimmedName = body.name.trim()
      if (!/^[a-zA-Z0-9\s\-\._]+$/.test(trimmedName)) {
        return Response.json({ error: 'Company name must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores' }, { status: 400 })
      }
      body.name = trimmedName
    }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('Error inserting company:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    await (await import('@/lib/audit-middleware')).logAuditAction(request, {
      entity_type: 'company',
      entity_id: data.id.toString(),
      action: 'create',
      after_state: data,
      company_id: data.id
    })

    return Response.json(data)
  } catch (error) {
    console.error('Error in POST /api/companies:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
