import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
        const filters = JSON.parse(searchParams.get('filters') || '{}')

        // Only admins can see system-wide audit logs
        await checkPermissions(request, ['admin'])

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let query = supabaseAdmin
            .from('audit_logs')
            .select(`
        *,
        users(name, surname, email),
        companies(name)
      `, { count: 'estimated' })

        // Apply filters
        if (filters.entity_type) {
            query = query.eq('entity_type', filters.entity_type)
        }
        if (filters.action) {
            query = query.eq('action', filters.action)
        }
        if (filters.user_id) {
            query = query.eq('user_id', filters.user_id)
        }
        if (filters.q) {
            const val = filters.q as string
            query = query.or('entity_id.ilike.%' + val + '%,ip.ilike.%' + val + '%')
        }

        query = query.order('created_at', { ascending: false })

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            console.error('Supabase error fetching audit logs:', error)
            return Response.json({ error: error.message }, { status: 500 })
        }

        return Response.json({
            data: data || [],
            totalCount: count || 0
        })

    } catch (error: any) {
        console.error('Internal server error in /api/admin/audit-logs:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Only admins can clear system-wide audit logs
        await checkPermissions(request, ['admin'])

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await supabaseAdmin
            .from('audit_logs')
            .delete()
            .neq('id', 0) // Delete all records

        if (error) {
            console.error('Supabase error clearing audit logs:', error)
            return Response.json({ error: error.message }, { status: 500 })
        }

        return Response.json({ success: true })

    } catch (error: any) {
        console.error('Internal server error in /api/admin/audit-logs DELETE:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
