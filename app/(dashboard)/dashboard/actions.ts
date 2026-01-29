'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'
import { withCache } from '@/lib/cache-utils'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { logger } from '@/lib/logger'

interface LocationHealth {
  id: number
  name: string
  companiesCount: number
  carsCount: number
}

export async function getDashboardStats() {
  const user = await getCurrentUser()
  if (!user) return null

  return withCache(
    async () => {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Используем новую RPC функцию для получения всех счетчиков за один раз
      const { data: stats, error } = await supabaseAdmin.rpc('get_admin_dashboard_stats')

      if (error) {
        logger.error('Error fetching dashboard stats via RPC', error)
        throw error
      }

      // Получаем локации для виджета "Здоровье" (только для админа)
      let locationsHealth: LocationHealth[] = []
      if (user.role === 'admin') {
        const { data: locations } = await supabaseAdmin
          .from('locations')
          .select(`
                id, 
                name,
                companies (count),
                car_templates (
                    company_cars (count)
                )
            `)

        if (locations) {
          locationsHealth = locations.map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            companiesCount: loc.companies?.[0]?.count || 0,
            carsCount: loc.car_templates?.reduce((sum: number, t: any) => sum + (t.company_cars?.[0]?.count || 0), 0) || 0
          }))
        }
      }

      return {
        ...(stats as any),
        locationsHealth
      }
    },
    ['admin-dashboard-stats', user.id],
    {
      tags: [CACHE_TAGS.DASHBOARD_STATS],
      revalidate: 60 // Кешируем на 60 секунд
    }
  )
}

export async function getAllCompanyCars() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    return []
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cars, error } = await supabaseAdmin
    .from('company_cars')
    .select(`
      id,
      license_plate,
      status,
      car_templates!inner(
        id,
        car_brands(name),
        car_models(name)
      ),
      companies(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    logger.error('Error fetching company cars', error)
    return []
  }

  return cars || []
}

export async function getCompanyStats(companyId: number) {
  const user = await getCurrentUser()
  if (!user) return null

  return withCache(
    async () => {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Используем RPC функцию для агрегации всех данных компании
      const { data, error } = await supabaseAdmin.rpc('get_company_dashboard_stats', {
        p_company_id: companyId
      })

      if (error) {
        logger.error('Error fetching company stats via RPC', error, { companyId })
        throw error
      }

      return data as any
    },
    ['company-stats', companyId.toString()],
    {
      tags: [CACHE_TAGS.COMPANY_STATS],
      revalidate: 60
    }
  )
}

export async function getManagerStats(companyId: number) {

  const supabase = await createClient()

  // Получаем ID всех машин компании
    const { data: companyCars } = await supabase
    .from('company_cars')
    .select('id')
    .eq('company_id', companyId)

  const carIds = companyCars?.map(c => c.id) || []

  // Текущий месяц (1-31 число)
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Получаем статистику параллельно
  const [
    { count: activeContracts },
    { count: totalBookings },
    { count: newBookingsThisMonth },
    { count: pendingTasks }
  ] = await Promise.all([
    // Активные контракты
    carIds.length > 0
      ? supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .in('company_car_id', carIds)
        .eq('status', 'active')
      : { count: 0 },
    // Все бронирования
    carIds.length > 0
      ? supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('company_car_id', carIds)
      : { count: 0 },
    // Новые бронирования за месяц
    carIds.length > 0
      ? supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('company_car_id', carIds)
        .gte('created_at', firstDayOfMonth.toISOString())
        .lte('created_at', lastDayOfMonth.toISOString())
      : { count: 0 },
    // Задачи в ожидании
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
  ])

  return {
    activeContracts: activeContracts || 0,
    totalBookings: totalBookings || 0,
    newBookingsThisMonth: newBookingsThisMonth || 0,
    pendingTasks: pendingTasks || 0
  }
}

export async function getTasks() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true })
    .limit(10)

  return tasks || []
}
