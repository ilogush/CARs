import { Suspense } from 'react'
import { getDashboardStats, getCompanyStats, getManagerStats } from './actions'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import {
  UserGroupIcon,
  TruckIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  PaintBrushIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import TasksTable from '@/components/dashboard/TasksTable'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'

interface DashboardPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser()
  if (!user) return null

  const params = await searchParams
  const adminMode = params?.admin_mode === 'true'
  const companyIdParam = params?.company_id ? parseInt(params.company_id as string) : null

  const scope = await getUserScope(user)

  // Определяем, показывать ли карточки овнера
  // Если админ в режиме Owner (admin_mode=true + company_id) или пользователь - Owner
  const isOwnerView = user.role === 'owner' || (user.role === 'admin' && adminMode && companyIdParam)
  const targetCompanyId = isOwnerView
    ? (user.role === 'admin' && adminMode && companyIdParam ? companyIdParam : scope.company_id)
    : null

  // Определяем, показывать ли карточки Manager
  const isManagerView = user.role === 'manager' && scope.company_id
  const managerCompanyId = isManagerView ? scope.company_id : null

  // Получаем статистику в зависимости от роли
  let stats
  let companyStats = null
  let managerStats = null

  // Всегда загружаем общую статистику для админа (нужно для карточки Companies)
  if (user.role === 'admin') {
    const statsData = getDashboardStats()
    try {
      stats = await statsData
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      stats = null
    }
  }

  if (isOwnerView && targetCompanyId) {
    // Для овнера или админа в режиме Owner - статистика компании
    try {
      companyStats = await getCompanyStats(targetCompanyId)
    } catch (error) {
      console.error('Failed to load company stats:', error)
      companyStats = null
    }
  } else if (isManagerView && managerCompanyId) {
    // Для менеджера - статистика его компании
    try {
      managerStats = await getManagerStats(managerCompanyId)
    } catch (error) {
      console.error('Failed to load manager stats:', error)
      managerStats = null
    }
  }

  // Карточки для админа
  type DashboardCard = {
    name: string
    value: string | number
    subtext: string
    icon: any
    href?: string
  }

  const adminCards: DashboardCard[] = [
    {
      name: 'Locations',
      value: stats?.locations || 0,
      subtext: 'total locations',
      icon: MapPinIcon,
      href: '/dashboard/locations',
    },
    {
      name: 'Companies',
      value: stats?.cars || 0,
      subtext: 'all cars',
      icon: BuildingOfficeIcon,
      href: '/dashboard/companies',
    },
    {
      name: 'Users',
      value: stats?.users || 0,
      subtext: 'total users',
      icon: UserGroupIcon,
      href: '/dashboard/users',
    },
    {
      name: 'Cars',
      value: stats?.cars || 0,
      subtext: 'total in fleet',
      icon: TruckIcon,
      href: undefined,
    },
    {
      name: 'Colors',
      value: stats?.colors || 0,
      subtext: 'available colors',
      icon: PaintBrushIcon,
      href: '/dashboard/colors',
    },
    {
      name: 'Payments',
      value: stats?.paymentTypes || 0,
      subtext: 'payment types',
      icon: CurrencyDollarIcon,
      href: '/dashboard/payments',
    },
  ]

  // Карточки для овнера (для админа при просмотре 1 компании)
  const ownerCards: DashboardCard[] = [
    {
      name: 'Users',
      value: `${companyStats?.totalUsers || 0}/${companyStats?.totalUsers || 0}`,
      subtext: 'total / online',
      icon: UserGroupIcon,
      href: '/dashboard/users',
    },
    {
      name: 'Cars',
      value: `${companyStats?.totalCars || 0}`,
      subtext: 'total',
      icon: TruckIcon,
      href: '/dashboard/cars',
    },
    {
      name: 'Contracts',
      value: `${companyStats?.contracts || 0}/${companyStats?.contractsThisMonth || 0}`,
      subtext: 'total / this month',
      icon: ClipboardDocumentListIcon,
      href: '/dashboard/contracts',
    },
    {
      name: 'Bookings',
      value: `${companyStats?.activeBookings || 0}/${companyStats?.activeBookingsThisMonth || 0}`,
      subtext: 'active / this month',
      icon: CalendarIcon,
      href: '/dashboard/contracts',
    },
    {
      name: 'Payments',
      value: `${(companyStats?.paymentsThisMonthAmount || 0).toLocaleString('ru-RU')} ฿`,
      subtext: 'this month',
      icon: BanknotesIcon,
      href: '/dashboard/payments',
    },
  ]

  // Карточки для менеджера
  const managerCards: DashboardCard[] = [
    {
      name: 'Active Contracts',
      value: managerStats?.activeContracts || 0,
      subtext: 'in progress',
      icon: CheckCircleIcon,
      href: '/dashboard/contracts',
    },
    {
      name: 'Bookings',
      value: `${managerStats?.totalBookings || 0}/${managerStats?.newBookingsThisMonth || 0}`,
      subtext: 'total / this month',
      icon: CalendarIcon,
      href: '/dashboard/contracts',
    },
    {
      name: 'Tasks',
      value: managerStats?.pendingTasks || 0,
      subtext: 'pending',
      icon: ClockIcon,
      href: '/dashboard',
    },
  ]

  // Определяем какие карточки показывать
  // Для овнера или админа в режиме Owner показываем карточки овнера
  // Для менеджера - карточки менеджера
  let statCards = isOwnerView ? ownerCards : (isManagerView ? managerCards : adminCards)

  // Добавляем параметры admin_mode и company_id к ссылкам, если админ в режиме Owner
  if (isOwnerView && user.role === 'admin' && adminMode && companyIdParam) {
    statCards = statCards.map(card => ({
      ...card,
      href: card.href ? `${card.href}?admin_mode=true&company_id=${companyIdParam}` : card.href
    }))
  }

  // Определяем количество колонок для grid
  const gridCols = 'lg:grid-cols-6'

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Карточки статистики */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${gridCols} gap-4`}>
        {statCards.map((stat) => {
          const Icon = stat.icon
          const CardContent = (
            <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200/60">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600 font-medium">{stat.name}</span>
                <Icon className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {stat.subtext}
                </div>
              </div>
            </div>
          )

          return stat.href ? (
            <Link key={stat.name} href={stat.href}>
              {CardContent}
            </Link>
          ) : (
            <div key={stat.name}>{CardContent}</div>
          )
        })}
      </div>

      {/* Секция Задания */}
      <TasksTable />
    </div>
  )
}
