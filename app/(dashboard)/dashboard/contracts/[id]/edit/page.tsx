import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import ContractForm from '@/components/contracts/ContractForm'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { headers } from 'next/headers'

interface EditContractPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function EditContractPage({ params, searchParams }: EditContractPageProps) {
  const { id } = await params
  const paramsObj = await searchParams
  const supabase = await createClient()

  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const scope = await getUserScope(user)

  // Check if admin is in Owner mode
  const adminMode = paramsObj?.admin_mode === 'true'
  const companyIdParam = paramsObj?.company_id as string | undefined
  const isAdminInOwnerMode = user.role === 'admin' && adminMode && companyIdParam

  // Determine company_id to check access
  let targetCompanyId: number | null = null

  if (user.role === 'admin') {
    // Admin can see everything, but if companyIdParam is present, we use it for context
    targetCompanyId = companyIdParam ? parseInt(companyIdParam) : null;
  } else if (user.role === 'owner' || user.role === 'manager') {
    targetCompanyId = scope.company_id || null;
  }

  // Use admin client to bypass RLS to check the contract's company
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch contract with related data
  const { data: contract, error } = await supabaseAdmin
    .from('contracts')
    .select(`
      *,
      company_cars(
        id,
        company_id,
        license_plate,
        price_per_day,
        mileage,
        car_templates(
          car_brands(name),
          car_models(name)
        )
      ),
      users!contracts_client_id_fkey(
        id,
        email,
        name,
        surname,
        phone,
        second_phone,
        telegram,
        passport_number,
        citizenship,
        city,
        gender
      )
    `)
    .eq('id', id)
    .single()

  if (error || !contract) {
    console.error('Error fetching contract:', error)
    notFound()
  }

  // Check access - verify contract belongs to user's company
  const contractCompanyId = contract.company_cars?.company_id

  if (targetCompanyId && contractCompanyId && contractCompanyId !== targetCompanyId) {
    redirect('/dashboard')
  }

  // Use the contract's company ID if no specific target was set (for general admins)
  const finalCompanyId = targetCompanyId || contractCompanyId

  const backHref = isAdminInOwnerMode
    ? `/dashboard/contracts?admin_mode=true&company_id=${finalCompanyId}`
    : `/dashboard/contracts`

  return (
    <ContractForm
      header={{
        title: 'Edit Contract',
        backHref
      }}
      submitLabel="Save"
      formId="edit-contract-form"
      companyId={finalCompanyId || undefined}
      initialData={{
        id: contract.id,
        company_car_id: contract.company_cars?.id || contract.car_id,
        client_id: contract.client_id || contract.user_id,
        manager_id: contract.manager_id,
        start_date: contract.start_date,
        end_date: contract.end_date,
        total_amount: contract.total_amount,
        deposit_amount: contract.deposit_amount,
        notes: contract.notes,
        status: contract.status,
        company_cars: contract.company_cars,
        users: contract.users,
        client: contract.users
      }}
    />
  )
}
