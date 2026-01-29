import { createClient } from '@supabase/supabase-js'
import { Location } from '@/types/database.types'
import Link from 'next/link'
import {
  MapPinIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  TruckIcon
} from '@heroicons/react/24/outline'

interface AdminDashboardProps {
  initialLocations: Location[]
}

export default async function AdminDashboard({ initialLocations }: AdminDashboardProps) {
  // Используем service role key для обхода RLS и показа данных без аутентификации
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Configuration Error</h3>
          <p className="text-red-600 mt-2">
            Missing Supabase environment variables. Please check your deployment configuration.
          </p>
        </div>
      </div>
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Получаем общую статистику
  const [
    locationsCount,
    companiesCount,
    carsCount,
    usersCount
  ] = await Promise.all([
    supabase.from('locations').select('id', { count: 'exact', head: true }),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('car_items').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true })
  ])

  // Получаем статистику по локациям
  const locationsWithStats = await Promise.all(
    initialLocations.map(async (location) => {
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id)

      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('location_id', location.id)

      let carsCount = 0
      if (companies && companies.length > 0) {
        const companyIds = companies.map(c => c.id)
        const { count } = await supabase
          .from('car_items')
          .select('id', { count: 'exact', head: true })
          .in('company_id', companyIds)
        carsCount = count || 0
      }

      return {
        ...location,
        companies_count: companiesCount || 0,
        cars_count: carsCount,
      }
    })
  )

  const stats = [
    {
      name: 'Локации',
      value: locationsCount.count || 0,
      icon: MapPinIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin'
    },
    {
      name: 'Компании',
      value: companiesCount.count || 0,
      icon: BuildingOfficeIcon,
      color: 'text-gray-800',
      bgColor: 'bg-gray-200',
      href: '/admin'
    },
    {
      name: 'Автомобили',
      value: carsCount.count || 0,
      icon: TruckIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/admin/cars'
    },
    {
      name: 'Users',
      value: usersCount.count || 0,
      icon: UserGroupIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div>
        <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">General Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} rounded-lg p-3`}>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Локации */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Локации</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locationsWithStats.map((location) => (
            <Link
              key={location.id}
              href={`/admin/locations/${location.id}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <MapPinIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">{location.companies_count}</span>
                  <span>компаний</span>
                </div>

                {location.companies_count > 0 && (
                  <div className="text-sm text-gray-500">
                    Автомобилей: <span className="font-medium text-gray-500">{location.cars_count}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

