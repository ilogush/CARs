import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import ManagerForm from '@/components/managers/ManagerForm'

interface CreateManagerPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CreateManagerPage({ searchParams }: CreateManagerPageProps) {
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

  const backHref = isAdminInOwnerMode
    ? `/dashboard/managers?admin_mode=true&company_id=${targetCompanyId}`
    : '/dashboard/managers'

  return (
    <ManagerForm
      header={{
        title: 'Create Manager',
        backHref
      }}
      submitLabel="Create"
      formId="create-manager-form"
      companyId={targetCompanyId}
    />
  )
}
