import { createClient } from '@/lib/supabase/server'
import { Location } from '@/types/database.types'
import Link from 'next/link'
import { MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'

interface LocationWithStats extends Location {
  companies_count: number
  cars_count: number
}

interface LocationsDashboardProps {
  initialLocations: Location[]
}

export default async function LocationsDashboard({ initialLocations }: LocationsDashboardProps) {
  const supabase = await createClient()

  // Получаем статистику для каждой локации
  const locationsWithStats: LocationWithStats[] = await Promise.all(
    initialLocations.map(async (location) => {
      // Получаем количество компаний
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id)

      // Получаем компании для подсчета автомобилей
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

  return (
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
  )
}
