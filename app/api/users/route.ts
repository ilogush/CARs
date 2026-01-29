import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { 
  parsePaginationParams, 
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG,
  PerformanceMonitor
} from '@/lib/api/performance'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/users')
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

    // Determine target company
    let targetCompanyId: number | null = null
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    }

    // Build query based on role
    let query

    if (targetCompanyId !== null) {
      // For owner/manager/admin in company mode - get users via managers table
      let managersQuery = supabaseAdmin
        .from('managers')
        .select(`
          user_id,
          users!inner(
            id, id_serial, email, role, name, surname, phone, second_phone, telegram, created_at
          )
        `, { count: 'estimated' })
        .eq('company_id', targetCompanyId)
        .neq('users.role', 'admin')

      if (params.filters.q) {
        const val = params.filters.q as string
        managersQuery = managersQuery.or(`users.name.ilike.%${val}%,users.surname.ilike.%${val}%,users.email.ilike.%${val}%`)
      }

      if (params.filters.role) {
        managersQuery = managersQuery.eq('users.role', params.filters.role)
      }

      const { data: managerUsers, count: managerCount, error: managerError } = await managersQuery
        .range((params.page - 1) * pageSize, params.page * pageSize - 1)

      if (managerError) {
        console.error('Error:', managerError)
        return createErrorResponse(managerError, 500)
      }

      // Extract users from joined data
      const usersData = managerUsers?.map(m => m.users).filter(Boolean) || []

      perf.end()

      return createCachedResponse(
        {
          data: usersData,
          totalCount: managerCount || 0
        },
        CACHE_CONFIG.USER_DATA
      )
    }

    // Admin in normal mode sees all users
    query = supabaseAdmin
      .from('users')
      .select('id, id_serial, email, role, name, surname, phone, second_phone, telegram, created_at', { count: 'estimated' })

    // Apply filters
    if (params.filters.q) {
      query = query.or(`name.ilike.%${params.filters.q}%,surname.ilike.%${params.filters.q}%,email.ilike.%${params.filters.q}%`)
    }
    if (params.filters.role) {
      query = query.eq('role', params.filters.role)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    // Apply pagination
    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Error fetching users:', error)
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

  } catch (error) {
    console.error('Error in /api/users:', error)
    return createErrorResponse(error as Error, 500)
  }
}
export async function POST(request: NextRequest) {
  try {
    const { user: currentActor } = await checkPermissions(request, ['admin', 'owner'])

    const body = await request.json()
    const {
      email,
      password,
      name,
      surname,
      role,
      phone,
      second_phone,
      telegram,
      gender,
      citizenship,
      city,
      passport_number
    } = body

    if (!email || !password || !name || !surname) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, name, surname }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return Response.json({ error: authError.message }, { status: 500 })
    }

    // 2. Insert into public.users table - using upsert to handle potential trigger-created records
    const { error: tableError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        name,
        surname,
        role: role || 'client',
        phone: phone?.replace(/\s/g, '') || null,
        second_phone: second_phone?.replace(/\s/g, '') || null,
        telegram: telegram || null,
        gender: gender || 'male',
        citizenship: citizenship || null,
        city: city || null,
        passport_number: passport_number || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (tableError) {
      console.error('Table insertion error:', tableError)
      // Attempt to cleanup Auth user if table insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return Response.json({ error: tableError.message }, { status: 500 })
    }

    // Audit Log
    try {
      const { logAuditAction } = await import('@/lib/audit-middleware')
      await logAuditAction(request, {
        entity_type: 'user',
        entity_id: authUser.user.id,
        action: 'create',
        after_state: { id: authUser.user.id, email, name, surname, role }
      })
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return Response.json({
      message: 'User created successfully',
      user: authUser.user
    })

  } catch (error: any) {
    console.error('Error in POST /api/users:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
