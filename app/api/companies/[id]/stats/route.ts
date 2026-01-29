import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = parseInt(id)

    if (isNaN(companyId)) {
      return Response.json({ error: 'Invalid company ID' }, { status: 400 })
    }

    // Check permissions - only admin, owner, manager can view company stats
    await checkPermissions(request, ['admin', 'owner', 'manager'])

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Получаем ID всех машин компании
    const { data: companyCars } = await supabaseAdmin
      .from('company_cars')
      .select('id')
      .eq('company_id', companyId)
    
    const carIds = companyCars?.map(car => car.id) || []

    // Получаем статистику параллельно
    const [
      { count: carsCount },
      { count: contractsCount },
      { count: activeContracts },
      { count: completedContracts },
      { count: managersCount },
      { count: activeManagers },
      { data: paymentsData }
    ] = await Promise.all([
      supabaseAdmin
        .from('company_cars')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      carIds.length > 0
        ? supabaseAdmin
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .in('company_car_id', carIds)
        : { count: 0 },
      carIds.length > 0
        ? supabaseAdmin
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .in('company_car_id', carIds)
            .eq('status', 'active')
        : { count: 0 },
      carIds.length > 0
        ? supabaseAdmin
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .in('company_car_id', carIds)
            .eq('status', 'completed')
        : { count: 0 },
      supabaseAdmin
        .from('managers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      supabaseAdmin
        .from('managers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true),
      (async () => {
        if (carIds.length === 0) {
          return { data: [] }
        }
        
        // Получаем ID контрактов компании
        const { data: contracts } = await supabaseAdmin
          .from('contracts')
          .select('id')
          .in('company_car_id', carIds)
        
        const contractIds = contracts?.map(c => c.id) || []
        
        if (contractIds.length === 0) {
          return { data: [] }
        }
        
        const { data: payments } = await supabaseAdmin
          .from('payments')
          .select('amount, payment_statuses(value)')
          .in('contract_id', contractIds)
        
        return { data: payments || [] }
      })()
    ])

    // Вычисляем общий доход (только положительные платежи)
    let totalRevenue = 0
    if (paymentsData && Array.isArray(paymentsData)) {
      paymentsData.forEach((payment: any) => {
        const statusValue = payment.payment_statuses?.value || 0
        if (statusValue > 0 && payment.amount) {
          totalRevenue += parseFloat(payment.amount.toString())
        }
      })
    }

    return Response.json({
      carsCount: carsCount || 0,
      contractsCount: contractsCount || 0,
      activeContracts: activeContracts || 0,
      completedContracts: completedContracts || 0,
      totalRevenue: totalRevenue || 0,
      managersCount: managersCount || 0,
      activeManagers: activeManagers || 0
    })

  } catch (error: any) {
    console.error('Error fetching company stats:', error)
    return Response.json(
      { error: error.message || 'Failed to fetch company statistics' },
      { status: 500 }
    )
  }
}
