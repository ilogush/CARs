import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { logAuditAction } from '@/lib/audit-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check permissions - only admin, owner, manager can view calendar events
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: event, error } = await supabaseAdmin
      .from('calendar_events')
      .select(`
        *,
        created_by_user:users(id, name, surname, email),
        companies(id, name)
      `)
      .eq('id', id)
      .single()

    if (error || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check access rights
    const adminCompanyId = await getAdminModeCompanyId(request)
    const eventCompanyId = event.company_id

    let hasAccess = false
    if (scope.role === 'admin') {
      hasAccess = true
    } else if (adminCompanyId && eventCompanyId === adminCompanyId) {
      hasAccess = true
    } else if (scope.role === 'owner' && scope.company_id === eventCompanyId) {
      hasAccess = true
    } else if (scope.role === 'manager' && scope.company_id === eventCompanyId) {
      hasAccess = true
    }

    if (!hasAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Log view action
    await logAuditAction(request, {
      entity_type: 'calendar_event',
      entity_id: id,
      action: 'view',
      company_id: adminCompanyId || eventCompanyId || null
    })

    return Response.json(event)

  } catch (error: any) {
    console.error('Error in GET /api/calendar-events/[id]:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Check permissions - only admin, owner, manager can update calendar events
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get existing event
    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      return Response.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check access rights
    const adminCompanyId = await getAdminModeCompanyId(request)
    const eventCompanyId = existingEvent.company_id

    let hasAccess = false
    if (scope.role === 'admin') {
      hasAccess = true
    } else if (adminCompanyId && eventCompanyId === adminCompanyId) {
      hasAccess = true
    } else if (scope.role === 'owner' && scope.company_id === eventCompanyId) {
      hasAccess = true
    } else if (scope.role === 'manager' && scope.company_id === eventCompanyId) {
      hasAccess = true
    }

    if (!hasAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.event_date !== undefined) updateData.event_date = body.event_date
    if (body.start_time !== undefined) updateData.start_time = body.start_time || null
    if (body.end_time !== undefined) updateData.end_time = body.end_time || null
    if (body.event_type !== undefined) updateData.event_type = body.event_type
    if (body.color !== undefined) updateData.color = body.color

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No data to update' }, { status: 400 })
    }

    // Update event
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users(id, name, surname, email),
        companies(id, name)
      `)
      .single()

    if (updateError) {
      console.error('Error updating calendar event:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: eventCompanyId,
      entity_type: 'calendar_event',
      entity_id: id.toString(),
      action: 'update',
      before_state: existingEvent,
      after_state: updatedEvent
    })

    return Response.json(updatedEvent, { status: 200 })

  } catch (error: any) {
    console.error('Error in PUT /api/calendar-events/[id]:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check permissions - only admin, owner, manager can delete calendar events
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get existing event for audit log
    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      return Response.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check access rights
    const adminCompanyId = await getAdminModeCompanyId(request)
    const eventCompanyId = existingEvent.company_id

    let hasAccess = false
    if (scope.role === 'admin') {
      hasAccess = true
    } else if (adminCompanyId && eventCompanyId === adminCompanyId) {
      hasAccess = true
    } else if (scope.role === 'owner' && scope.company_id === eventCompanyId) {
      hasAccess = true
    } else if (scope.role === 'manager' && scope.company_id === eventCompanyId) {
      hasAccess = true
    }

    if (!hasAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete event
    const { error: deleteError } = await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting calendar event:', deleteError)
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: eventCompanyId,
      entity_type: 'calendar_event',
      entity_id: id.toString(),
      action: 'delete',
      before_state: existingEvent
    })

    return Response.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('Error in DELETE /api/calendar-events/[id]:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
