import { createClient } from '@/lib/supabase/server'
import CarForm from '@/components/cars/CarForm'
import OwnerCarForm from '@/components/cars/OwnerCarForm'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { headers } from 'next/headers'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

interface EditCarPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function EditCarPage({ params, searchParams }: EditCarPageProps) {
  const { id } = await params
  const paramsObj = await searchParams
  const supabase = await createClient()

  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const scope = await getUserScope(user)
  
  // Check if admin is in Owner mode - use searchParams from URL
  const adminMode = paramsObj?.admin_mode === 'true'
  const companyIdParam = paramsObj?.company_id as string | undefined
  const isAdminInOwnerMode = user.role === 'admin' && adminMode && companyIdParam

  // Admin editing car_items (templates) - use CarForm
  if (user.role === 'admin' && !isAdminInOwnerMode) {
    // Fetch Car with relations
    const { data: car, error } = await supabase
      .from('car_items')
      .select(`
        *,
        car_brand_models (
          brand,
          model
        )
      `)
      .eq('id', id)
      .single()

    if (error || !car) {
      notFound()
    }

    // Fetch Brand Locations
    const { data: brandLocations } = await supabase
      .from('brand_locations')
      .select('location_id')
      .eq('brand_model_id', car.brand_model_id)

    const locationIds = brandLocations?.map(bl => bl.location_id) || []

    // Fetch Options
    const [brandsResult, locationsResult, companiesResult] = await Promise.all([
      supabase.from('car_brand_models').select('brand').order('brand'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('companies').select('id, name').order('name')
    ])

    const uniqueBrands = Array.from(new Set(brandsResult.data?.map(b => b.brand) || []))
    const locations = locationsResult.data || []
    const companies = companiesResult.data || []

    // Prepare initial data
    const initialData = {
      id: car.id,
      brand: car.car_brand_models?.brand || '',
      model: car.car_brand_models?.model || '',
      year: car.year,
      doors: car.doors,
      body_type: car.body_type,
      engine_volume: car.engine_volume,
      color: car.color,
      price_per_day: car.price_per_day,
      seats: car.seats,
      transmission: car.transmission as 'Automatic' | 'Manual',
      status: car.status as 'available' | 'maintenance' | 'rented',
      description: car.description || '',
      company_id: car.company_id,
      location_ids: locationIds,
      photos: car.photos || [],
    }

    return (
      <div className="space-y-6">
        <CarForm 
          initialData={initialData}
          brands={uniqueBrands}
          locations={locations}
          companies={companies}
          header={{ title: 'Edit Car', backHref: `/dashboard/cars/${id}` }}
          submitLabel="Save"
          formId="edit-car-form"
        />
      </div>
    )
  }

  // Owner or Admin in Owner mode - edit company_cars
  let targetCompanyId: number | null = null
  
  if (isAdminInOwnerMode) {
    targetCompanyId = parseInt(companyIdParam!)
  } else if (user.role === 'owner' && scope.company_id) {
    targetCompanyId = scope.company_id
  }

  if (targetCompanyId) {
    // Use admin client to bypass RLS
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch company_car with all related data
    const { data: car, error } = await supabaseAdmin
      .from('company_cars')
      .select(`
        *,
        car_templates(
          *,
          car_brands(name),
          car_models(name),
          car_body_types(name),
          car_classes(name),
          car_fuel_types(name),
          car_door_counts(count),
          car_seat_counts(count),
          car_transmission_types(name),
          car_engine_volumes(volume)
        ),
        car_colors(name, hex_code),
        companies(id, name)
      `)
      .eq('id', id)
      .single()

    if (error || !car) {
      console.error('Error fetching company car:', error)
      notFound()
    }

    // Check access
    if (car.company_id !== targetCompanyId) {
      redirect('/dashboard')
    }

    // Get all available templates with all related data
    const { data: templates } = await supabaseAdmin
      .from('car_templates')
      .select(`
        *,
        car_brands(name),
        car_models(name),
        car_body_types(name),
        car_classes(name),
        car_fuel_types(name),
        car_door_counts(count),
        car_seat_counts(count),
        car_transmission_types(name),
        car_engine_volumes(volume)
      `)
      .order('id')

    // Get colors
    const { data: colors } = await supabaseAdmin
      .from('car_colors')
      .select('*')
      .order('name')

    const backHref = isAdminInOwnerMode 
      ? `/dashboard/cars/${id}?admin_mode=true&company_id=${targetCompanyId}`
      : `/dashboard/cars/${id}`

    return (
      <div className="space-y-6">
        <OwnerCarForm 
          company={car.companies!}
          templates={templates || []}
          colors={colors || []}
          header={{ title: 'Edit Car', backHref }}
          submitLabel="Save"
          formId="edit-car-form"
          initialData={car}
        />
      </div>
    )
  }

  redirect('/dashboard')
}
