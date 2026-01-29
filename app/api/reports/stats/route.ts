import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export async function GET(request: NextRequest) {
  try {
    // Check permissions - only admin, owner, manager can view stats
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
    } else if (scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'admin') {
      const { searchParams } = new URL(request.url)
      const companyIdParam = searchParams.get('company_id')
      if (companyIdParam) {
        targetCompanyId = parseInt(companyIdParam)
      }
    }

    if (!targetCompanyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get company cars
    const { data: companyCars, count: totalCars } = await supabaseAdmin
      .from('company_cars')
      .select('id, status', { count: 'exact' })
      .eq('company_id', targetCompanyId)

    const availableCars = companyCars?.filter(car => car.status === 'available').length || 0

    // Get contracts
    const carIds = companyCars?.map(c => c.id) || []
    
    const { data: contracts, count: totalContracts } = await supabaseAdmin
      .from('contracts')
      .select('id, status', { count: 'exact' })
      .in('company_car_id', carIds)

    const activeContracts = contracts?.filter(contract => 
      contract.status === 'active' || contract.status === 'confirmed'
    ).length || 0

    // Get unique clients count
    const { count: totalClients } = await supabaseAdmin
      .from('contracts')
      .select('client_id', { count: 'exact', head: true })
      .in('company_car_id', carIds)

    // Get total revenue from all completed payments
    const contractIds = contracts?.map(c => c.id) || []
    
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, payment_types(sign)')
      .in('contract_id', contractIds)
      .eq('status', 'paid')

    let totalRevenue = 0
    if (payments) {
      payments.forEach((payment: any) => {
        const amount = parseFloat(payment.amount?.toString() || '0')
        const sign = payment.payment_types?.sign || '+'
        
        if (sign === '+' || amount > 0) {
          totalRevenue += Math.abs(amount)
        }
      })
    }

    return Response.json({
      totalCars: totalCars || 0,
      availableCars,
      totalContracts: totalContracts || 0,
      activeContracts,
      totalClients: totalClients || 0,
      totalRevenue
    })

  } catch (error: any) {
    console.error('Error in GET /api/reports/stats:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
