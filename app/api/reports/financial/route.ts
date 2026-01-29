import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Check permissions - only admin, owner can view financial reports
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner']
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
    } else if (scope.role === 'admin') {
      // Admin must specify company_id
      const companyIdParam = searchParams.get('company_id')
      if (companyIdParam) {
        targetCompanyId = parseInt(companyIdParam)
      } else {
        return Response.json({ error: 'Company ID is required for admin' }, { status: 400 })
      }
    }

    if (!targetCompanyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Calculate date range based on period
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date = new Date(now)
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    if (startDate && endDate) {
      // Custom date range
      periodStart = new Date(startDate)
      periodEnd = new Date(endDate)
      periodEnd.setHours(23, 59, 59, 999)
      
      // Previous period (same duration before)
      const duration = periodEnd.getTime() - periodStart.getTime()
      previousPeriodEnd = new Date(periodStart.getTime() - 1)
      previousPeriodStart = new Date(previousPeriodEnd.getTime() - duration)
    } else {
      // Predefined periods
      switch (period) {
        case 'day':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
          periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
          previousPeriodStart = new Date(periodStart.getTime() - 86400000)
          previousPeriodEnd = new Date(periodStart.getTime() - 1)
          break
        case 'week':
          const dayOfWeek = now.getDay()
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0)
          periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6, 23, 59, 59)
          previousPeriodStart = new Date(periodStart.getTime() - 604800000)
          previousPeriodEnd = new Date(periodStart.getTime() - 1)
          break
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
          previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0)
          previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
          break
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
          periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
          previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0)
          previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
          break
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
          previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0)
          previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      }
    }

    // Get company cars
    const { data: companyCars } = await supabaseAdmin
      .from('company_cars')
      .select('id')
      .eq('company_id', targetCompanyId)
    
    const carIds = companyCars?.map(c => c.id) || []
    
    if (carIds.length === 0) {
      return Response.json({
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString()
        },
        current: {
          income: 0,
          expenses: 0,
          profit: 0
        },
        previous: {
          income: 0,
          expenses: 0,
          profit: 0
        },
        trends: {
          income: 0,
          expenses: 0,
          profit: 0
        }
      })
    }

    // Get contract IDs
    const { data: contracts } = await supabaseAdmin
      .from('contracts')
      .select('id')
      .in('company_car_id', carIds)
    
    const contractIds = contracts?.map(c => c.id) || []
    
    if (contractIds.length === 0) {
      return Response.json({
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString()
        },
        current: {
          income: 0,
          expenses: 0,
          profit: 0
        },
        previous: {
          income: 0,
          expenses: 0,
          profit: 0
        },
        trends: {
          income: 0,
          expenses: 0,
          profit: 0
        }
      })
    }

    // Get payments for current period
    const { data: currentPayments } = await supabaseAdmin
      .from('payments')
      .select(`
        amount,
        payment_types(sign)
      `)
      .in('contract_id', contractIds)
      .gte('payment_date', periodStart.toISOString())
      .lte('payment_date', periodEnd.toISOString())

    // Get payments for previous period
    const { data: previousPayments } = await supabaseAdmin
      .from('payments')
      .select(`
        amount,
        payment_types(sign)
      `)
      .in('contract_id', contractIds)
      .gte('payment_date', previousPeriodStart.toISOString())
      .lte('payment_date', previousPeriodEnd.toISOString())

    // Calculate current period
    let currentIncome = 0
    let currentExpenses = 0

    if (currentPayments) {
      currentPayments.forEach((payment: any) => {
        const amount = parseFloat(payment.amount?.toString() || '0')
        const sign = payment.payment_types?.sign || '+'
        
        if (sign === '+' || amount > 0) {
          currentIncome += Math.abs(amount)
        } else {
          currentExpenses += Math.abs(amount)
        }
      })
    }

    const currentProfit = currentIncome - currentExpenses

    // Calculate previous period
    let previousIncome = 0
    let previousExpenses = 0

    if (previousPayments) {
      previousPayments.forEach((payment: any) => {
        const amount = parseFloat(payment.amount?.toString() || '0')
        const sign = payment.payment_types?.sign || '+'
        
        if (sign === '+' || amount > 0) {
          previousIncome += Math.abs(amount)
        } else {
          previousExpenses += Math.abs(amount)
        }
      })
    }

    const previousProfit = previousIncome - previousExpenses

    // Calculate trends (percentage change)
    const incomeTrend = previousIncome > 0 
      ? ((currentIncome - previousIncome) / previousIncome) * 100 
      : (currentIncome > 0 ? 100 : 0)
    
    const expensesTrend = previousExpenses > 0 
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
      : (currentExpenses > 0 ? 100 : 0)
    
    const profitTrend = previousProfit !== 0 
      ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100 
      : (currentProfit > 0 ? 100 : (currentProfit < 0 ? -100 : 0))

    return Response.json({
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        type: period
      },
      current: {
        income: currentIncome,
        expenses: currentExpenses,
        profit: currentProfit
      },
      previous: {
        income: previousIncome,
        expenses: previousExpenses,
        profit: previousProfit
      },
      trends: {
        income: Math.round(incomeTrend * 100) / 100,
        expenses: Math.round(expensesTrend * 100) / 100,
        profit: Math.round(profitTrend * 100) / 100
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/reports/financial:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
