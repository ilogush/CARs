import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export const dynamic = 'force-dynamic'

import { 
  createCachedResponse, 
  CACHE_CONFIG, 
  PerformanceMonitor,
  parsePaginationParams
} from '@/lib/api/performance'

export const revalidate = 60 // 1 minute

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/contracts')
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    // Check permissions - only admin, owner, manager can view contracts
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
    const adminCompanyId = await getAdminModeCompanyId(request)

    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    }

    // Build optimized query with minimal fields - filtering handled by targetCompanyId
    let selectQuery = `
      id, client_id, company_car_id, manager_id, start_date, end_date, total_amount, deposit_amount, status, created_at,
      company_cars!inner(
        id, company_id, license_plate,
        car_templates(car_brands(name), car_models(name))
      ),
      client:users!contracts_client_id_fkey!inner(name, surname)
    `

    let query = supabaseAdmin
      .from('contracts')
      .select(selectQuery, { count: 'estimated' })

    // Apply company filter using !inner join
    if (targetCompanyId !== null) {
      query = query.eq('company_cars.company_id', targetCompanyId)
    }

    // Apply filters
    if (params.filters.q) {
      const val = params.filters.q as string
      query = query.or(`status.ilike.%${val}%,client.name.ilike.%${val}%,client.surname.ilike.%${val}%,company_cars.license_plate.ilike.%${val}%`)
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    // Apply pagination
    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching contracts:', error)
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
    console.error('Internal server error in /api/contracts:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}



import { contractSchema } from '@/lib/validations/contracts'

export async function POST(request: NextRequest) {
  try {
    const { user, scope } = await checkPermissions(
      request,
      ['owner', 'manager', 'admin']
    )

    const body = await request.json()

    // Validate with Zod
    const validatedData = contractSchema.parse(body)
    const { booking_id, client_id, company_car_id, manager_id, start_date, end_date, total_amount, deposit_amount, notes, photos } = validatedData

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get Car Version for Optimistic Locking (if not passed from front-end yet, we fetch it lightly)
    // Ideally, frontend should send this to ensure true concurrency safety.
    let carVersion = null
    const { data: currentCar } = await supabaseAdmin.from('company_cars').select('updated_at').eq('id', company_car_id).single()
    if (currentCar) {
      carVersion = currentCar.updated_at
    }

    // Determine manager_id
    let finalManagerId = manager_id || user.id

    // 2. Call RPC - Atomic Transaction
    const { data, error } = await supabaseAdmin.rpc('create_contract_flow', {
      p_booking_id: booking_id || null,
      p_client_id: client_id,
      p_company_car_id: company_car_id,
      p_car_updated_at: carVersion, // Passing current DB version for now. Future: pass from request body.
      p_manager_id: finalManagerId,
      p_start_date: start_date,
      p_end_date: end_date,
      p_total_amount: total_amount,
      p_deposit_amount: deposit_amount || 0,
      p_notes: notes || '',
      p_photos: photos || [],
      p_created_by: user.id,
      p_company_id: scope.company_id || null, // Allow null for super admins if needed, or enforce
      p_audit_metadata: {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      }
    })

    if (error) {
      console.error('Error creating contract via RPC:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // 3. Create automatic payments for the contract
    try {
      // Get payment statuses and types
      const { data: paymentStatuses } = await supabaseAdmin
        .from('payment_statuses')
        .select('id, name, value')
        .limit(10)

      const { data: paymentTypes } = await supabaseAdmin
        .from('payment_types')
        .select('id, name, sign')
        .limit(10)

      if (paymentStatuses && paymentTypes) {
        // Find "Pending" status (value = 0)
        const pendingStatus = paymentStatuses.find(
          s => s.name.toLowerCase() === 'pending' || s.value === 0
        )

        // Find payment types
        const rentalType = paymentTypes.find(
          t => t.name.toLowerCase().includes('rental')
        )
        const depositType = paymentTypes.find(
          t => t.name.toLowerCase().includes('deposit') && t.sign === '+'
        )

        if (pendingStatus && rentalType && depositType && data?.contract_id) {
          const paymentsToCreate = []

          // Create Rental Fee payment
          if (total_amount > 0) {
            paymentsToCreate.push({
              company_id: scope.company_id,
              contract_id: data.contract_id,
              payment_status_id: pendingStatus.id,
              payment_type_id: rentalType.id,
              amount: total_amount,
              payment_method: 'pending',
              notes: 'Rental Fee (Auto-created)',
              created_by: user.id
            })
          }

          // Create Deposit payment
          if (deposit_amount > 0) {
            paymentsToCreate.push({
              company_id: scope.company_id,
              contract_id: data.contract_id,
              payment_status_id: pendingStatus.id,
              payment_type_id: depositType.id,
              amount: deposit_amount,
              payment_method: 'pending',
              notes: 'Deposit Received (Auto-created)',
              created_by: user.id
            })
          }

          // Insert payments
          if (paymentsToCreate.length > 0) {
            await supabaseAdmin
              .from('payments')
              .insert(paymentsToCreate)
          }
        }
      }
    } catch (paymentError) {
      console.error('Error creating automatic payments:', paymentError)
      // Don't fail the contract creation if payment creation fails
    }

    return Response.json(data, { status: 201 })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Internal server error in POST /api/contracts:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
