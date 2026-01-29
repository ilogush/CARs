import { getRepositories } from '@/lib/repositories'
import { getCurrentUser } from '@/lib/auth'
import CarsClient from './CarsClient'

export default async function CarsPage() {
  const { cars, locations } = await getRepositories()
  const user = await getCurrentUser()

  // Parallel fetching for performance
  const [
    { data: initialBrands },
    { data: initialModels },
    { data: initialLocations },
    initialReferenceData
  ] = await Promise.all([
    cars.listBrands({ pageSize: 100 }),
    cars.listModels({ pageSize: 100 }),
    locations.listLocations({ pageSize: 100 }),
    cars.getReferenceData()
  ])

  return (
    <CarsClient
      initialBrands={initialBrands as any}
      initialModels={initialModels as any}
      initialLocations={initialLocations as any}
      initialReferenceData={initialReferenceData}
      userRole={user?.role || null}
    />
  )
}
