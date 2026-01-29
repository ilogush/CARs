import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

/**
 * GET /api/tasks/company-users
 * Returns owners for admin, or owner and managers for owner/manager (excluding clients)
 * Used for task assignment dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const companyUsers: Array<{ id: string; name: string | null; surname: string | null; email: string; role: string }> = []

    // For admin: only return owners (all owners from all companies)
    if (scope.role === 'admin') {
      // Get all owners from all companies
      const { data: companies } = await supabaseAdmin
        .from('companies')
        .select('owner_id')
      
      if (companies && companies.length > 0) {
        const ownerIds = [...new Set(companies.map(c => c.owner_id).filter(Boolean))]
        if (ownerIds.length > 0) {
          const { data: owners } = await supabaseAdmin
            .from('users')
            .select('id, name, surname, email, role')
            .in('id', ownerIds)
            .eq('role', 'owner')
          
          if (owners) {
            companyUsers.push(...owners)
          }
        }
      }
      
      return Response.json({ data: companyUsers })
    }

    // For owner/manager: get owner and managers of the company
    // Determine company_id
    let targetCompanyId: number | null = null
    
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    }

    if (!targetCompanyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get owner of the company
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('owner_id')
      .eq('id', targetCompanyId)
      .single()

    if (company?.owner_id) {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('id, name, surname, email, role')
        .eq('id', company.owner_id)
        .single()

      if (owner) {
        companyUsers.push(owner)
      }
    }

    // Get managers of the company
    const { data: managers } = await supabaseAdmin
      .from('managers')
      .select(`
        user:users(id, name, surname, email, role)
      `)
      .eq('company_id', targetCompanyId)
      .eq('is_active', true)

    if (managers) {
      managers.forEach((m: any) => {
        if (m.user && !companyUsers.find(u => u.id === m.user.id)) {
          companyUsers.push(m.user)
        }
      })
    }

    return Response.json({ data: companyUsers })

  } catch (error: any) {
    console.error('Error in GET /api/tasks/company-users:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
