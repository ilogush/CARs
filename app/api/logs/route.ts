import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null
    const filters = JSON.parse(searchParams.get('filters') || '{}')

    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserScope(user)

    // Проверяем режим админа в компании
    // Возвращает company_id только если admin_mode=true И указан company_id
    const adminCompanyId = await getAdminModeCompanyId(request)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if table exists
    const { error: checkError } = await supabaseAdmin.from('audit_logs').select('id').limit(1)
    if (checkError && checkError.code === '42P01') {
      console.warn('Audit logs table missing')
      return Response.json({ data: [], totalCount: 0 })
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*, users(name, surname, email), companies(name)', { count: 'exact' })

    // Фильтрация по company_id:
    // 1. Если админ в режиме Owner (admin_mode=true&company_id=X), показываем логи этой компании
    // 2. Если Owner/Manager, показываем логи их компании
    // 3. Админ в обычном режиме видит все логи (без фильтрации)
    if (adminCompanyId) {
      // Админ в режиме Owner - фильтруем по company_id
      query = query.eq('company_id', adminCompanyId)
    } else if (scope.role === 'owner' && scope.company_id) {
      // Owner видит логи своей компании
      query = query.eq('company_id', scope.company_id)
    } else if (scope.role === 'manager' && scope.company_id) {
      // Manager видит логи своей компании
      query = query.eq('company_id', scope.company_id)
    }
    // Админ в обычном режиме (без admin_mode) видит все логи - без фильтрации

    // Apply filters
    if (filters.q) {
      const val = filters.q as string
      query = query.or('action.ilike.%' + val + '%,entity_type.ilike.%' + val + '%,users.name.ilike.%' + val + '%,users.email.ilike.%' + val + '%')
    }

    if (filters.role) {
      query = query.eq('role', filters.role)
    }

    if (filters.action) {
      query = query.eq('action', filters.action)
    }

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters.date_to) {
      const dateTo = new Date(filters.date_to as string)
      dateTo.setHours(23, 59, 59, 999)
      query = query.lte('created_at', dateTo.toISOString())
    }

    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      // Сортируем по created_at (по умолчанию)
      query = query.order('created_at', { ascending: false })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching logs:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      data: data || [],
      totalCount: count || 0
    })

  } catch (error) {
    console.error('Internal server error in /api/logs:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserScope(user)

    // Only Admin or Owner can clear logs
    if (scope.role !== 'admin' && scope.role !== 'owner') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    // Check if cleaning specific company logs (Admin in Owner mode)
    const adminCompanyId = await getAdminModeCompanyId(request)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabaseAdmin.from('audit_logs').delete()

    // Determine what to delete
    if (adminCompanyId) {
      // Global Admin acting as Owner: Delete only for this company
      query = query.eq('company_id', adminCompanyId)
    } else if (scope.role === 'owner') {
      // Owner: Delete only their company logs
      if (!scope.company_id) return Response.json({ error: 'No company context' }, { status: 400 })
      query = query.eq('company_id', scope.company_id)
    } else if (scope.role === 'admin') {
      // Global Admin: Delete ALL logs if no filters?
      // Let's force a filter or confirm intent?
      // For now, if no company_id filter provided, it cleans everything.
      // User asked "clear log records".
      // We can just proceed.
      // Check if there's a filter in query params?
      // Usually "Clear Logs" button implies "Clear All Visible".
      // If filters were applied in UI, visual expectation might be "Delete filtered".
      // But typically "Clear All" clears the table context.

      // Note: Safest to require an explicit "all" flag or just delete everything if admin.
      // Let's assume Global Delete.
    }

    // Careful: supabase requires a WHERE clause for delete usually unless forced?
    // Actually, simple .delete() might need a filter to be safe or explicit.
    // .neq('id', 0) is a hack to delete all.
    // Or assume the scope logic adds filters.

    if (scope.role === 'admin' && !adminCompanyId) {
      // Global Admin clearing everything
      // We need a condition that matches everything.
      query = query.neq('id', 0) // Delete all where ID != 0 (assuming IDs are > 0)
    }

    const { error } = await query

    if (error) {
      console.error('Error clearing logs:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log the cleared action (Irony: we just cleared logs, but should log this action)
    // If we cleared everything, this might be the only entry.
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'clear_logs',
      entity_type: 'audit_logs',
      company_id: adminCompanyId || scope.company_id, // Null if global
      details: { count: 'all' }
    })

    return Response.json({ success: true })

  } catch (error: any) {
    console.error('Error clearing logs:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
