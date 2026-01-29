import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import CarForm from '@/components/cars/CarForm'
import OwnerCarForm from '@/components/cars/OwnerCarForm'
import { redirect } from 'next/navigation'
import { getCurrentUser, getUserScope } from '@/lib/auth'

interface PageProps {
  searchParams: Promise<{ admin_mode?: string; company_id?: string }>
}

export default async function CreateCarPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // Admin client for privileged access
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const scope = await getUserScope(user)

  // Get URL parameters properly from searchParams
  const params = await searchParams
  const adminMode = params.admin_mode === 'true'
  const companyIdParam = params.company_id
  const isAdminInOwnerMode = user.role === 'admin' && adminMode && companyIdParam

  // Admin uses existing form (for templates), Owner uses new form (for company_cars)
  if (user.role === 'admin' && !isAdminInOwnerMode) {
    // Fetch data for admin form
    const [brandsResult, locationsResult, companiesResult] = await Promise.all([
      supabase.from('car_brand_models').select('brand').order('brand'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('companies').select('id, name').order('name')
    ])

    const uniqueBrands = Array.from(new Set(brandsResult.data?.map(b => b.brand) || []))
    const locations = locationsResult.data || []
    const companies = companiesResult.data || []

    return (
      <div className="space-y-6">
        <CarForm
          brands={uniqueBrands}
          locations={locations}
          companies={companies}
          header={{ title: 'Add Car', backHref: '/dashboard/cars' }}
          submitLabel="Create"
          formId="create-car-form"
          enableAddBrand
        />
      </div>
    )
  }

  // Owner form or Admin in Owner mode
  let targetCompanyId: number | null = null

  if (isAdminInOwnerMode) {
    targetCompanyId = parseInt(companyIdParam!)
  } else if (user.role === 'owner' && scope.company_id) {
    targetCompanyId = scope.company_id
  }

  if (targetCompanyId) {
    // Use admin client if user is admin (to see any company), otherwise standard client
    const client = isAdminInOwnerMode ? supabaseAdmin : supabase

    // Get company details
    const { data: company } = await client
      .from('companies')
      .select('*, locations(name)')
      .eq('id', targetCompanyId)
      .single()

    if (!company) {
      redirect('/dashboard')
    }

    // Get all available templates
    const { data: templates } = await client
      .from('car_templates')
      .select(`
        *,
        car_brands(name),
        car_models(name),
        car_body_types(name),
        car_classes(name),
        car_fuel_types(name)
      `)
      .order('id')

    // Get colors
    const { data: colors } = await client
      .from('car_colors')
      .select('*')
      .order('name')

    const backHref = isAdminInOwnerMode
      ? `/dashboard/cars?admin_mode=true&company_id=${targetCompanyId}`
      : '/dashboard/cars'

    return (
      <div className="space-y-6">
        <OwnerCarForm
          company={company}
          templates={templates || []}
          colors={colors || []}
          header={{ title: 'Add Car', backHref }}
          submitLabel="Create"
          formId="create-car-form"
        />
      </div>
    )
  }

  // Other roles - redirect
  redirect('/dashboard')
}
