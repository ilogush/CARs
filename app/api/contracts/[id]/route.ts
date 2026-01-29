import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { logAuditAction } from '@/lib/audit-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from('contracts')
      .select(`
        *,
        company_cars(
          id,
          license_plate,
          car_templates(
            car_brands(name),
            car_models(name)
          )
        ),
        client:users!contracts_client_id_fkey(id, name, surname, email),
        manager:users!contracts_manager_id_fkey(id, name, surname, email)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'Contract not found' }, { status: 404 })
      }
      console.error('Error fetching contract:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Проверка доступа
    let targetCompanyId: number | null = null
    if (scope.role === 'owner' || scope.role === 'manager') {
      const { data: car } = await supabaseAdmin
        .from('company_cars')
        .select('company_id')
        .eq('id', data.company_car_id)
        .single()

      if (car && car.company_id !== scope.company_id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      targetCompanyId = car?.company_id || null
    }

    // Log view action
    const adminCompanyId = await getAdminModeCompanyId(request)
    await logAuditAction(request, {
      entity_type: 'contract',
      entity_id: id,
      action: 'view',
      company_id: adminCompanyId || targetCompanyId || undefined
    })

    return Response.json({ data: [data] })
  } catch (error: any) {
    console.error('Internal server error in GET /api/contracts/[id]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const body = await request.json()
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Проверка доступа к контракту
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('company_cars(company_id)')
      .eq('id', id)
      .single()

    if (contractError || !contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 })
    }

    if (scope.role === 'owner' || scope.role === 'manager') {
      const companyId = contract.company_cars?.[0]?.company_id
      if (companyId !== scope.company_id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Обновление контракта
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating contract:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data })
  } catch (error: any) {
    console.error('Internal server error in PUT /api/contracts/[id]:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
