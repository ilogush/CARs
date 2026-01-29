import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { createCachedResponse, createErrorResponse, CACHE_CONFIG, PerformanceMonitor } from '@/lib/api/performance'

export async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/calendar-events')
  
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const companyIdParam = searchParams.get('company_id')

    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let targetCompanyId: number | null = null
    
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'admin' && companyIdParam) {
      targetCompanyId = parseInt(companyIdParam)
    }

    let queryBuilder = supabaseAdmin
      .from('calendar_events')
      .select(`
        id,
        company_id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        event_type,
        color,
        created_by,
        created_at,
        created_by_user:users(id, name, surname, email)
      `)

    if (targetCompanyId !== null) {
      queryBuilder = queryBuilder.eq('company_id', targetCompanyId)
    }

    if (startDate) {
      queryBuilder = queryBuilder.gte('event_date', startDate)
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('event_date', endDate)
    }

    queryBuilder = queryBuilder.order('event_date', { ascending: true })

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Supabase error fetching calendar events:', error)
      return createErrorResponse(error, 500)
    }

    perf.end()

    return createCachedResponse(
      {
        data: data || [],
        totalCount: data?.length || 0
      },
      CACHE_CONFIG.DYNAMIC_DATA
    )

  } catch (error: any) {
    console.error('Internal server error in GET /api/calendar-events:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return createErrorResponse(error, error.message.includes('Unauthorized') ? 401 : 403)
    }
    return createErrorResponse(error, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only admin, owner, manager can create calendar events
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const body = await request.json()
    const { company_id, title, description, event_date, start_time, end_time, event_type, color } = body

    if (!title || !event_date) {
      return Response.json({ error: 'Title and event date are required' }, { status: 400 })
    }

    // Validate event_date format
    if (isNaN(new Date(event_date).getTime())) {
      return Response.json({ error: 'Invalid event date format' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id
    let targetCompanyId: number | null = null
    
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'admin' && company_id) {
      targetCompanyId = parseInt(company_id)
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'manager' && scope.company_id) {
      targetCompanyId = scope.company_id
    }

    if (!targetCompanyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Create calendar event
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        company_id: targetCompanyId,
        title: title.trim(),
        description: description?.trim() || null,
        event_date,
        start_time: start_time || null,
        end_time: end_time || null,
        event_type: event_type || 'general',
        color: color || '#3B82F6',
        created_by: user.id
      })
      .select(`
        *,
        created_by_user:users(id, name, surname, email)
      `)
      .single()

    if (eventError) {
      console.error('Error creating calendar event:', eventError)
      return Response.json({ error: eventError.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: targetCompanyId,
      entity_type: 'calendar_event',
      entity_id: eventData.id.toString(),
      action: 'create',
      after_state: eventData
    })

    return Response.json(eventData, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/calendar-events:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
