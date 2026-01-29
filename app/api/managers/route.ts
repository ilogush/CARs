import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
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
  const perf = new PerformanceMonitor('GET /api/managers')
  
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)
    const companyIdParam = request.nextUrl.searchParams.get('company_id')
    const isActiveParam = request.nextUrl.searchParams.get('is_active')

    // Check permissions - only admin, owner, manager can view managers
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id for filtering
    let targetCompanyId: number | null = null

    // Check if admin is in owner mode
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      // Owner sees only managers of their company
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      // Manager sees only managers of their company
      targetCompanyId = scope.company_id
    } else if (scope.role === 'admin') {
      // Admin can filter by company_id from query param, or see all
      if (companyIdParam) {
        targetCompanyId = parseInt(companyIdParam)
      } else {
        // Admin sees all managers (no filter)
        targetCompanyId = null
      }
    }

    let query = supabaseAdmin
      .from('managers')
      .select(`
        id, company_id, is_active, created_at,
        user:users(id, name, surname, email, phone, telegram)
      `, { count: 'estimated' })

    // Apply role-based filtering
    if (targetCompanyId !== null) {
      query = query.eq('company_id', targetCompanyId)
    }

    // Apply filters
    if (params.filters.q) {
      query = query.or(`user.name.ilike.%${params.filters.q}%,user.surname.ilike.%${params.filters.q}%,user.email.ilike.%${params.filters.q}%`)
    }

    // Apply is_active filter from query param or filters
    if (isActiveParam !== null) {
      query = query.eq('is_active', isActiveParam === 'true')
    } else if (params.filters.is_active !== undefined) {
      query = query.eq('is_active', params.filters.is_active === 'true' || params.filters.is_active === true)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    // Apply pagination
    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching managers:', error)
      return createErrorResponse(error, 500)
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
    console.error('Internal server error in GET /api/managers:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return createErrorResponse(error, error.message.includes('Unauthorized') ? 401 : 403)
    }
    return createErrorResponse(error, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Owners and admins can create managers
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner']
    )

    const body = await request.json()
    const { email, password, name, surname, gender, phone, second_phone, telegram, passport_number, citizenship, city, company_id, is_active } = body

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id
    let targetCompanyId: number | null = null

    if (scope.role === 'admin' && company_id) {
      targetCompanyId = parseInt(company_id)
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    }

    if (!targetCompanyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Create auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return Response.json({ error: authError.message }, { status: 500 })
    }

    if (!authData.user) {
      return Response.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create user record with manager role - using upsert to handle potential trigger-created records
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: email.trim(),
        role: 'manager',
        name: name?.trim() || null,
        surname: surname?.trim() || null,
        gender: gender || null,
        phone: phone?.replace(/\s/g, '') || null,
        second_phone: second_phone?.replace(/\s/g, '') || null,
        telegram: telegram?.trim()?.replace('@', '') || null,
        passport_number: passport_number?.trim() || null,
        citizenship: citizenship?.trim() || null,
        city: city?.trim() || null
      }, { onConflict: 'id' })

    if (userError) {
      // Cleanup: delete auth user if user creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Error creating user record:', userError)
      return Response.json({ error: userError.message }, { status: 500 })
    }

    // Create manager record
    const { data: managerData, error: managerError } = await supabaseAdmin
      .from('managers')
      .insert({
        user_id: authData.user.id,
        company_id: targetCompanyId,
        is_active: is_active !== undefined ? is_active : true
      })
      .select(`
        *,
        user:users(*)
      `)
      .single()

    if (managerError) {
      // Cleanup: delete user and auth user if manager creation fails
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Error creating manager record:', managerError)
      return Response.json({ error: managerError.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: targetCompanyId,
      entity_type: 'manager',
      entity_id: managerData.id.toString(),
      action: 'create',
      after_state: managerData
    })

    updateTag(CACHE_TAGS.DASHBOARD_STATS)

    return Response.json(managerData, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/managers:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
