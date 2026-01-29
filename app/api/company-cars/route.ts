import { NextRequest } from 'next/server'
import { checkPermissions } from '@/lib/rbac-middleware'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
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

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/company-cars')
  
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    const user = await getCurrentUser()
    if (!user) {
      return createErrorResponse(new Error('Unauthorized'), 401)
    }

    const scope = await getUserScope(user)
    const adminCompanyId = await getAdminModeCompanyId(request)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id for filtering
    let companyId: number | null = null

    if (adminCompanyId) {
      companyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      companyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      companyId = scope.company_id
    } else if (scope.role === 'admin') {
      companyId = null
    } else {
      return createErrorResponse(new Error('Forbidden'), 403)
    }

    let query = supabaseAdmin
      .from('company_cars')
      .select(`
        id, company_id, template_id, color_id, mileage, vin, license_plate,
        price_per_day, status, photos, seasonal_prices, created_at, next_oil_change_mileage,
        car_templates(
          id, body_production_start_year,
          car_brands(id, name),
          car_models(id, name),
          car_body_types(id, name),
          car_classes(id, name),
          car_fuel_types(id, name),
          car_door_counts(id, count),
          car_seat_counts(id, count),
          car_transmission_types(id, name),
          car_engine_volumes(id, volume)
        ),
        car_colors(id, name, hex_code)
      `, { count: 'estimated' })

    if (companyId !== null) {
      query = query.eq('company_id', companyId)
    }

    // Apply search filters
    if (params.filters.q) {
      const val = params.filters.q as string
      if (val.startsWith('#')) {
        query = query.ilike('license_plate', `%${val.slice(1)}%`)
      } else {
        query = query.or(`license_plate.ilike.%${val}%,vin.ilike.%${val}%,description.ilike.%${val}%`)
      }
    }

    if (params.filters.status) {
      query = query.eq('status', params.filters.status)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching company cars:', error)
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

  } catch (error) {
    console.error('Internal server error in /api/company-cars:', error)
    return createErrorResponse(error as Error, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserScope(user)
    const adminCompanyId = await getAdminModeCompanyId(request)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id
    let companyId: number | null = null

    if (adminCompanyId) {
      companyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      companyId = scope.company_id
    } else if (scope.role === 'admin') {
      // Admin can specify company_id in body
      companyId = body.company_id || null
    } else {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!companyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Validate required fields
    if (!body.template_id) {
      return Response.json({ error: 'Template ID is required' }, { status: 400 })
    }

    if (!body.license_plate) {
      return Response.json({ error: 'License plate is required' }, { status: 400 })
    }

    // Prepare car data
    const carData = {
      company_id: companyId,
      template_id: body.template_id,
      color_id: body.color_id || null,
      mileage: body.mileage || 0,
      vin: body.vin || null,
      license_plate: body.license_plate.trim(),
      year: body.year || null,
      price_per_day: parseFloat(body.price_per_day) || 0,
      deposit: parseFloat(body.deposit) || 0,
      daily_mileage_limit: body.daily_mileage_limit ? parseInt(body.daily_mileage_limit) : null,
      min_rental_days: body.min_rental_days ? parseInt(body.min_rental_days) : 1,
      photos: body.photos || [],
      document_photos: body.document_photos || [],
      next_oil_change_mileage: body.next_oil_change_mileage || null,
      insurance_expiry: body.insurance_expiry || null,
      registration_expiry: body.registration_expiry || null,
      insurance_type: body.insurance_type || null,
      price_per_month: body.price_per_month || null,
      marketing_headline: body.marketing_headline || null,
      featured_image_index: body.featured_image_index || 0,
      description: body.description || null,
      status: body.status || 'available',
      seasonal_prices: body.seasonal_prices || []
    }

    const { data, error } = await supabaseAdmin
      .from('company_cars')
      .insert(carData)
      .select(`
        *,
        car_templates(
          car_brands(name),
          car_models(name)
        ),
        car_colors(name)
      `)
      .single()

    if (error) {
      console.error('Error creating company car:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: companyId,
      entity_type: 'company_car',
      entity_id: data.id.toString(),
      action: 'create',
      after_state: data
    })

    updateTag(CACHE_TAGS.DASHBOARD_STATS)
    updateTag(CACHE_TAGS.COMPANY_STATS)

    return Response.json(data, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/company-cars:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
