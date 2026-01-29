import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
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
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/clients')
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)
    const passport = request.nextUrl.searchParams.get('passport')

    // Check permissions - only admin, owner, manager can view clients
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
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'admin') {
      targetCompanyId = null
    }

    // Build query with optimized fields
    let query = supabaseAdmin
      .from('users')
      .select('id, id_serial, name, surname, email, phone, second_phone, telegram, passport_number, citizenship, gender, role, created_at', { count: 'estimated' })
      .eq('role', 'client')

    // Apply filters
    if (params.filters.q) {
      const val = params.filters.q as string
      query = query.or(`name.ilike.%${val}%,surname.ilike.%${val}%,email.ilike.%${val}%`)
    }

    // Passport search
    if (passport) {
      query = query.eq('passport_number', passport)
      query = query.limit(1)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching clients:', error)
      return createErrorResponse(error, 500)
    }

    // Fetch client profiles and contracts separately
    const userIds = (data || []).map((client: any) => client.id)
    let clientProfilesMap: Record<string, any> = {}
    let contractsMap: Record<string, any[]> = {}

    if (userIds.length > 0) {
      // Fetch client profiles
      const { data: profilesData } = await supabaseAdmin
        .from('client_profiles')
        .select('user_id, phone, address, passport_number')
        .in('user_id', userIds)

      if (profilesData) {
        profilesData.forEach((profile: any) => {
          clientProfilesMap[profile.user_id] = profile
        })
      }

      // Fetch contracts for these clients
      let contractsQuery = supabaseAdmin
        .from('contracts')
        .select('client_id, id, status, total_amount')
        .in('client_id', userIds)

      // Filter contracts by company if needed
      if (targetCompanyId !== null) {
        const { data: companyCars } = await supabaseAdmin
          .from('company_cars')
          .select('id')
          .eq('company_id', targetCompanyId)

        const carIds = companyCars?.map(c => c.id) || []
        if (carIds.length > 0) {
          contractsQuery = contractsQuery.in('company_car_id', carIds)
        }
      }

      const { data: contractsData } = await contractsQuery

      if (contractsData) {
        contractsData.forEach((contract: any) => {
          if (!contractsMap[contract.client_id]) {
            contractsMap[contract.client_id] = []
          }
          contractsMap[contract.client_id].push(contract)
        })
      }
    }

    // Process data to add computed fields
    const processedData = (data || []).map((client: any) => {
      const contracts = contractsMap[client.id] || []
      const activeContracts = contracts.filter((c: any) => c.status === 'active')
      const totalSpent = contracts.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0)

      return {
        user_id: client.id,
        users: {
          id: client.id,
          id_serial: client.id_serial,
          name: client.name,
          surname: client.surname,
          email: client.email,
          phone: client.phone,
          second_phone: client.second_phone,
          telegram: client.telegram,
          passport_number: client.passport_number,
          citizenship: client.citizenship,
          gender: client.gender,
          role: client.role,
          created_at: client.created_at
        },
        client_profiles: clientProfilesMap[client.id] || null,
        contracts_count: contracts.length,
        has_active_contract: activeContracts.length > 0,
        total_spent: totalSpent
      }
    })

    perf.end()

    return createCachedResponse(
      {
        data: processedData,
        totalCount: count || 0
      },
      CACHE_CONFIG.USER_DATA
    )

  } catch (error: any) {
    console.error('Internal server error in /api/clients:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return createErrorResponse(error, error.message.includes('Unauthorized') ? 401 : 403)
    }
    return createErrorResponse(error, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Owners, managers and admins can create clients
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const body = await request.json()
    const { email, password, name, surname, gender, phone, second_phone, telegram, passport_number, citizenship, city, address, company_id } = body

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
    } else if (scope.role === 'manager' && scope.company_id) {
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

    // Create user record with client role - using upsert to handle potential trigger-created records
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: email.trim(),
        role: 'client',
        name: name?.trim() || null,
        surname: surname?.trim() || null,
        gender: gender || null,
        phone: phone?.replace(/\s/g, '') || null,
        second_phone: second_phone?.replace(/\s/g, '') || null,
        telegram: telegram?.trim()?.replace('@', '') || null,
        passport_number: passport_number?.trim() || null,
        passport_photos: body.passport_photos || [],
        driver_license_photos: body.driver_license_photos || [],
        citizenship: citizenship?.trim() || null,
        city: city?.trim() || null
      }, { onConflict: 'id' })

    if (userError) {
      // Cleanup: delete auth user if user creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Error creating user record:', userError)
      return Response.json({ error: userError.message }, { status: 500 })
    }

    // Create client profile (passport_number moved to users table, but keeping here for backward compatibility)
    const { data: clientProfileData, error: clientProfileError } = await supabaseAdmin
      .from('client_profiles')
      .insert({
        user_id: authData.user.id,
        phone: phone?.replace(/\s/g, '') || null,
        address: address?.trim() || null,
        passport_number: passport_number?.trim() || null
      })
      .select()
      .single()

    if (clientProfileError) {
      // Cleanup: delete user and auth user if client profile creation fails
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Error creating client profile:', clientProfileError)
      return Response.json({ error: clientProfileError.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: targetCompanyId,
      entity_type: 'client',
      entity_id: authData.user.id,
      action: 'create',
      after_state: {
        user_id: authData.user.id,
        email: email.trim(),
        name: name?.trim() || null,
        surname: surname?.trim() || null
      }
    })

    return Response.json({
      user_id: authData.user.id,
      users: {
        id: authData.user.id,
        email: email.trim(),
        name: name?.trim() || null,
        surname: surname?.trim() || null,
        phone: phone?.replace(/\s/g, '') || null
      },
      client_profiles: clientProfileData
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/clients:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
