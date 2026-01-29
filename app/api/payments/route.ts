import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPermissions } from '@/lib/rbac-middleware'
import { 
  parsePaginationParams, 
  createCachedResponse, 
  CACHE_CONFIG,
  PerformanceMonitor
} from '@/lib/api/performance'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const perf = new PerformanceMonitor('GET /api/payments')
    try {
        const params = parsePaginationParams(request.nextUrl.searchParams)
        const pageSize = Math.min(params.pageSize, 100)
        const companyId = request.nextUrl.searchParams.get('company_id')

        // Check permissions - only admin, owner, manager can view payments
        await checkPermissions(
            request,
            ['admin', 'owner', 'manager']
        )

        const supabase = await createClient()

        // Build base select query with minimal fields
        let selectQuery = `
          id, company_id, contract_id, payment_status_id, payment_type_id, amount, payment_method, created_at,
          payment_statuses(name, value),
          contracts!inner(
            id,
            client:users!contracts_client_id_fkey!inner(name, surname)
          ),
          creator:users!payments_created_by_fkey(name, surname)
        `

        // If filtering by sign, force inner join on payment_types to allow filtering
        if (params.filters.sign) {
            selectQuery += `, payment_types!inner(name, sign)`
        } else {
            selectQuery += `, payment_types(name, sign)`
        }

        let query = supabase
            .from('payments')
            .select(selectQuery, { count: 'estimated' })

        // Apply filters
        if (params.filters.q) {
            const val = params.filters.q as string
            query = query.or(`payment_statuses.name.ilike.%${val}%,contracts.client.name.ilike.%${val}%,contracts.client.surname.ilike.%${val}%`)
        }

        if (params.filters.sign) {
            query = query.eq('payment_types.sign', params.filters.sign)
        }

        if (companyId) {
            query = query.eq('company_id', companyId)
        }

        // Apply sorting
        const sortBy = params.sortBy || 'created_at'
        query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

        // Apply pagination
        const from = (params.page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            console.error('Supabase error fetching payments:', error)
            return Response.json({ error: error.message }, { status: 500 })
        }

        perf.end()

        return createCachedResponse(
            {
                data: data || [],
                totalCount: count || 0
            },
            CACHE_CONFIG.USER_DATA
        )

    } catch (error: any) {
        console.error('Internal server error in /api/payments:', error)
        if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
        }
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await checkPermissions(
            request,
            ['admin', 'owner', 'manager']
        )

        const body = await request.json()
        const { contract_id, payment_status_id, amount, payment_method, notes } = body

        if (!contract_id || !payment_status_id || !amount || !payment_method) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = await createClient()

        // Create payment - RLS will verify if the user has permission to insert for this contract
        const { data, error } = await supabase
            .from('payments')
            .insert({
                contract_id,
                payment_status_id,
                amount,
                payment_method,
                notes: notes || null,
                created_by: user.id
            })
            .select(`
        *,
        payment_statuses(name, value)
      `)
            .single()

        if (error) {
            console.error('Error creating payment:', error)
            return Response.json({ error: error.message }, { status: 500 })
        }

        // Audit Log
        try {
            const { logAuditAction } = await import('@/lib/audit-middleware')
            await logAuditAction(request, {
                entity_type: 'payment',
                entity_id: data.id.toString(),
                action: 'create',
                after_state: data
            })
        } catch (auditError) {
            console.error('Failed to log audit action:', auditError)
            // Don't fail the request if audit logging fails
        }

        return Response.json(data, { status: 201 })

    } catch (error: any) {
        console.error('Internal server error in POST /api/payments:', error)
        if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
        }
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
