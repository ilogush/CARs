import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { logAuditAction } from '@/lib/audit-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check permissions - only admin, owner, manager can view client details
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get client user data
    const { data: clientUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'client')
      .single()

    if (userError || !clientUser) {
      return Response.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get client profile
    const { data: clientProfile } = await supabaseAdmin
      .from('client_profiles')
      .select('*')
      .eq('user_id', id)
      .single()

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
    // Admin sees all data (targetCompanyId === null)

    // Get contracts for this client
    let contractsQuery = supabaseAdmin
      .from('contracts')
      .select(`
        id,
        status,
        start_date,
        end_date,
        total_amount,
        created_at,
        company_cars(
          id,
          license_plate,
          car_templates(
            car_brands(name),
            car_models(name)
          )
        ),
        manager:users(id, name, surname, email)
      `)
      .eq('client_id', id)

    // Filter by company if needed
    if (targetCompanyId !== null) {
      // First get company_cars for this company
      const { data: companyCars } = await supabaseAdmin
        .from('company_cars')
        .select('id')
        .eq('company_id', targetCompanyId)

      const carIds = companyCars?.map(c => c.id) || []
      if (carIds.length > 0) {
        contractsQuery = contractsQuery.in('company_car_id', carIds)
      } else {
        // No cars for this company, so no contracts
        return Response.json({
          client: {
            ...clientUser,
            client_profile: clientProfile || null
          },
          contracts: [],
          payments: [],
          statistics: {
            total_contracts: 0,
            active_contracts: 0,
            total_spent: 0,
            total_payments: 0
          }
        })
      }
    }

    const { data: contracts, error: contractsError } = await contractsQuery.order('created_at', { ascending: false })

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError)
    }

    // Get payments for contracts of this client
    const contractIds = (contracts || []).map((c: any) => c.id)
    let payments: any[] = []

    if (contractIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabaseAdmin
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          notes,
          contracts(id, status),
          payment_statuses(name, color)
        `)
        .in('contract_id', contractIds)
        .order('payment_date', { ascending: false })

      if (!paymentsError && paymentsData) {
        payments = paymentsData
      }
    }

    // Calculate statistics
    const totalContracts = (contracts || []).length
    const activeContracts = (contracts || []).filter((c: any) => c.status === 'active').length
    const totalSpent = (contracts || []).reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0)
    const totalPayments = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

    // Log view action
    await logAuditAction(request, {
      entity_type: 'client',
      entity_id: id,
      action: 'view',
      company_id: targetCompanyId || undefined
    })

    return Response.json({
      client: {
        ...clientUser,
        client_profile: clientProfile || null
      },
      contracts: contracts || [],
      payments: payments || [],
      statistics: {
        total_contracts: totalContracts,
        active_contracts: activeContracts,
        total_spent: totalSpent,
        total_payments: totalPayments
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/clients/[id]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check permissions
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const body = await request.json()
    const { name, surname, email, gender, phone, second_phone, telegram, passport_number, citizenship, city, passport_photos, driver_license_photos } = body

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update user record
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        name: name?.trim() || null,
        surname: surname?.trim() || null,
        email: email?.trim() || null,
        gender: gender || null,
        phone: phone?.replace(/\s/g, '') || null,
        second_phone: second_phone?.replace(/\s/g, '') || null,
        telegram: telegram?.trim()?.replace('@', '') || null,
        passport_number: passport_number?.trim() || null,
        passport_photos: passport_photos || [],
        driver_license_photos: driver_license_photos || [],
        citizenship: citizenship?.trim() || null,
        city: city?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('role', 'client')
      .select()
      .single()

    if (updateError) {
      console.error('Error updating client user:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    // Update client profile for backward compatibility
    await supabaseAdmin
      .from('client_profiles')
      .update({
        phone: phone?.replace(/\s/g, '') || null,
        passport_number: passport_number?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)

    // Log action
    await logAuditAction(request, {
      entity_type: 'client',
      entity_id: id,
      action: 'update',
      after_state: updatedUser,
      company_id: scope.company_id || undefined
    })

    return Response.json(updatedUser)

  } catch (error: any) {
    console.error('Error in PUT /api/clients/[id]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
