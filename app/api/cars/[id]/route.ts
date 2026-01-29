import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPermissions } from '@/lib/rbac-middleware'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check permissions
    await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('car_items')
      .select('*, car_brand_models(brand, model), companies(name)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'Car not found' }, { status: 404 })
      }
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log (optional for view)
    try {
      const { logAuditAction } = await import('@/lib/audit-middleware')
      await logAuditAction(request, {
        entity_type: 'car',
        entity_id: id,
        action: 'view',
        company_id: data.company_id || undefined
      })
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return Response.json(data)
  } catch (error: any) {
    console.error('Internal server error in GET /api/cars/[id]:', error)
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

    // Check permissions
    await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const body = await request.json()
    const supabase = await createClient()

    // Get old data for audit log and permission check
    const { data: oldData, error: fetchError } = await supabase
      .from('car_items')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !oldData) {
      return Response.json({ error: 'Car not found' }, { status: 404 })
    }

    // Update car
    const { data, error } = await supabase
      .from('car_items')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating car:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    try {
      const { logAuditAction } = await import('@/lib/audit-middleware')
      await logAuditAction(request, {
        entity_type: 'car',
        entity_id: id,
        action: 'update',
        before_state: oldData,
        after_state: data,
        company_id: data.company_id || undefined
      })
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return Response.json(data)
  } catch (error: any) {
    console.error('Internal server error in PUT /api/cars/[id]:', error)
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

    // Only admins and owners can delete cars
    await checkPermissions(
      request,
      ['admin', 'owner']
    )

    const supabase = await createClient()

    // Get old data for audit log
    const { data: oldData, error: fetchError } = await supabase
      .from('car_items')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !oldData) {
      return Response.json({ error: 'Car not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('car_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting car:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    try {
      const { logAuditAction } = await import('@/lib/audit-middleware')
      await logAuditAction(request, {
        entity_type: 'car',
        entity_id: id,
        action: 'delete',
        before_state: oldData,
        company_id: oldData.company_id || undefined
      })
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Internal server error in DELETE /api/cars/[id]:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
