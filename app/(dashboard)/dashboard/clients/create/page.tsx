import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import ClientForm from '@/components/clients/ClientForm'

interface CreateClientPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CreateClientPage({ searchParams }: CreateClientPageProps) {
  const supabase = await createClient()
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

  // Verify company exists and user has access
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', targetCompanyId)
    .single()

  if (companyError || !company) {
    redirect('/dashboard')
  }

  // Check access for owner
  if (user.role === 'owner' && company.owner_id !== user.id) {
    redirect('/dashboard')
  }

  // Check access for manager - manager must belong to this company
  if (user.role === 'manager') {
    const { data: managerProfile } = await supabase
      .from('manager_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!managerProfile || managerProfile.company_id !== targetCompanyId) {
      redirect('/dashboard')
    }
  }

  const backHref = isAdminInOwnerMode
    ? `/dashboard/users?admin_mode=true&company_id=${targetCompanyId}&tab=clients`
    : '/dashboard/users?tab=clients'

  return (
    <ClientForm
      header={{
        title: 'Create Client',
        backHref
      }}
      submitLabel="Create"
      formId="create-client-form"
      companyId={targetCompanyId}
    />
  )
}
