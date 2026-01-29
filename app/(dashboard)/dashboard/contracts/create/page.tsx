import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import ContractForm from '@/components/contracts/ContractForm'

interface CreateContractPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CreateContractPage({ searchParams }: CreateContractPageProps) {
  const supabase = await createClient()
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const user = await getCurrentUser()

  if (!user) redirect('/auth/login')

  const scope = await getUserScope(user)
  const paramsObj = await searchParams

  // Check if admin is in Owner mode
  const adminMode = paramsObj?.admin_mode === 'true'
  const companyIdParam = paramsObj?.company_id as string | undefined
  const isAdminInOwnerMode = user.role === 'admin' && adminMode && companyIdParam

  // Determine company_id
  let targetCompanyId: number | null = null

  if (isAdminInOwnerMode) {
    targetCompanyId = parseInt(companyIdParam!)
  } else if (user.role === 'owner' && scope.company_id) {
    targetCompanyId = scope.company_id
  } else if (user.role === 'manager' && scope.company_id) {
    targetCompanyId = scope.company_id
  } else if (user.role === 'admin') {
    // Admin must specify company_id
    if (!companyIdParam) {
      redirect('/dashboard/companies')
    }
    targetCompanyId = parseInt(companyIdParam)
  }

  if (!targetCompanyId) {
    redirect('/dashboard')
  }

  // Verify company exists and user has access (use admin client to bypass RLS)
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', targetCompanyId)
    .single()

  // For admin, allow even if company not found (they might be creating for any company)
  if (user.role !== 'admin' && (companyError || !company)) {
    redirect('/dashboard')
  }

  // Check access for owner (skip for admin)
  if (user.role === 'owner' && company && company.owner_id !== user.id) {
    redirect('/dashboard')
  }

  // Check access for manager - manager must belong to this company (use admin client to bypass RLS)
  if (user.role === 'manager') {
    const { data: managerProfiles, error: managerError } = await supabaseAdmin
      .from('managers')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const managerProfile = managerProfiles?.[0]

    if (managerError || !managerProfile || managerProfile.company_id !== targetCompanyId) {
      redirect('/dashboard')
    }
  }

  const backHref = isAdminInOwnerMode
    ? `/dashboard/contracts?admin_mode=true&company_id=${targetCompanyId}`
    : '/dashboard/contracts'

  // Fetch initial data for the form (compliance with .cursorrules: no client-side fetching)
  const locationId = 4 // Phuket
  const [
    { data: districts },
    { data: hotels },
    { data: countries },
    { data: cities },
    { data: currencies },
    { data: cars }
  ] = await Promise.all([
    supabaseAdmin.from('districts').select('id, name').eq('location_id', locationId).order('name'),
    supabaseAdmin.from('hotels').select('id, name, district_id').eq('location_id', locationId).eq('is_active', true).order('name'),
    supabaseAdmin.from('countries').select('name').order('name'),
    supabaseAdmin.from('cities').select('name').order('name'),
    supabaseAdmin.from('currencies').select('id, code, symbol').eq('is_active', true).order('name'),
    supabaseAdmin.from('company_cars').select('*, car_templates(*, car_brands(name), car_models(name))').eq('company_id', targetCompanyId).eq('status', 'available')
  ])

  return (
    <ContractForm
      header={{
        title: 'Create Contract',
        backHref
      }}
      submitLabel="Save"
      formId="create-contract-form"
      companyId={targetCompanyId}
      initialReferences={{
        districts: districts || [],
        hotels: hotels || [],
        countries: countries || [],
        cities: cities || [],
        currencies: currencies || [],
        availableCars: cars || []
      }}
    />
  )
}
