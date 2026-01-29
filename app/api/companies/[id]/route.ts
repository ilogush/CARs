import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = parseInt(id)

    // Проверка прав доступа
    const { user, scope, isAdminMode } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager'],
      companyId
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*, locations(name)')
      .eq('id', id)
      .single()

    if (error) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    return Response.json({
      ...data,
      _meta: {
        isAdminMode,
        userRole: scope.role,
        canEdit: scope.role === 'admin' || (scope.role === 'owner' && scope.company_id === companyId)
      }
    })
  } catch (error: any) {
    console.error('Error fetching company:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = parseInt(id)
    const body = await request.json()

    // Проверка прав доступа (только admin или owner своей компании)
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Проверяем существование компании
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (fetchError || !existingCompany) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    // Проверяем права на изменение (owner может менять только свою компанию)
    if (scope.role === 'owner' && existingCompany.owner_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    if (body.name !== undefined) {
      const trimmedName = body.name.trim()
      if (!/^[a-zA-Z0-9\s\-\._]+$/.test(trimmedName)) {
        return Response.json({ error: 'Company name must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores' }, { status: 400 })
      }
      updateData.name = trimmedName
    }
    if (body.email !== undefined) {
      updateData.email = body.email.trim() || null
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone.replace(/\s/g, '') || null
    }
    if (body.address !== undefined) {
      updateData.address = body.address.trim() || null
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }
    if (body.currency_id !== undefined) {
      updateData.currency_id = parseInt(body.currency_id)
    }
    if (body.settings !== undefined) {
      updateData.settings = body.settings

      // If not admin, protect Admin-only settings (seasons, duration_ranges)
      // by restoring them from the existing company record
      if (scope.role !== 'admin' && existingCompany.settings) {
        updateData.settings.seasons = existingCompany.settings.seasons;
        updateData.settings.duration_ranges = existingCompany.settings.duration_ranges;
      }
    }
    if (body.location_id !== undefined) {
      updateData.location_id = parseInt(body.location_id)
    }
    // owner_id нельзя изменять после создания

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No data to update' }, { status: 400 })
    }

    // Обновляем компанию
    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select('*, locations(name)')
      .single()

    if (updateError) {
      console.error('Error updating company:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    // Audit Log
    await (await import('@/lib/audit-middleware')).logAuditAction(request, {
      entity_type: 'company',
      entity_id: companyId.toString(),
      action: 'update',
      before_state: existingCompany,
      after_state: updatedCompany,
      company_id: companyId
    })

    return Response.json(updatedCompany, { status: 200 })
  } catch (error: any) {
    console.error('Error updating company:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = parseInt(id)

    // Проверка прав доступа (только admin или owner своей компании)
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner']
    )

    // Для овнера проверяем, что он удаляет свою компанию
    if (scope.role === 'owner' && scope.company_id !== companyId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get old data for audit
    const { data: oldData } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    if (oldData) {
      await (await import('@/lib/audit-middleware')).logAuditAction(request, {
        entity_type: 'company',
        entity_id: id,
        action: 'delete',
        before_state: oldData,
        company_id: scope.company_id || undefined
      })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting company:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
