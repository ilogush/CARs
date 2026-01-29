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
    
    // Check permissions - only admin, owner, manager can view payment details
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get payment with all related data
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        contracts(
          id,
          status,
          start_date,
          end_date,
          total_amount,
          client_id,
          company_cars(
            id,
            license_plate,
            company_id,
            car_templates(
              car_brands(name),
              car_models(name)
            )
          ),
          client:users(id, name, surname, email)
        ),
        payment_statuses(
          id,
          name,
          value,
          color
        ),
        created_by_user:users!payments_created_by_fkey(id, name, surname, email)
      `)
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Determine company_id for access check
    let targetCompanyId: number | null = null
    
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    }
    // Admin sees all payments (targetCompanyId === null)

    // Check if user has access to this payment
    if (targetCompanyId !== null && payment.contracts?.company_cars?.company_id !== targetCompanyId) {
      return Response.json({ error: 'Forbidden: You do not have access to this payment' }, { status: 403 })
    }

    // Format response
    const response = {
      id: payment.id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      notes: payment.notes,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      contract: payment.contracts ? {
        id: payment.contracts.id,
        status: payment.contracts.status,
        start_date: payment.contracts.start_date,
        end_date: payment.contracts.end_date,
        total_amount: payment.contracts.total_amount,
        car: payment.contracts.company_cars ? {
          id: payment.contracts.company_cars.id,
          license_plate: payment.contracts.company_cars.license_plate,
          brand: payment.contracts.company_cars.car_templates?.car_brands?.name || null,
          model: payment.contracts.company_cars.car_templates?.car_models?.name || null
        } : null,
        client: payment.contracts.client ? {
          id: payment.contracts.client.id,
          name: payment.contracts.client.name,
          surname: payment.contracts.client.surname,
          email: payment.contracts.client.email
        } : null
      } : null,
      status: payment.payment_statuses ? {
        id: payment.payment_statuses.id,
        name: payment.payment_statuses.name,
        value: payment.payment_statuses.value,
        color: payment.payment_statuses.color
      } : null,
      created_by: payment.created_by_user ? {
        id: payment.created_by_user.id,
        name: payment.created_by_user.name,
        surname: payment.created_by_user.surname,
        email: payment.created_by_user.email
      } : null
    }

    // Log view action
    await logAuditAction(request, {
      entity_type: 'payment',
      entity_id: id,
      action: 'view',
      company_id: targetCompanyId || undefined
    })

    return Response.json(response)

  } catch (error: any) {
    console.error('Error fetching payment details:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
