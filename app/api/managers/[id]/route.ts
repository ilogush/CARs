import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Проверяем права доступа - только admin и owner могут обновлять менеджеров
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Получаем текущего менеджера
    const { data: existingManager, error: fetchError } = await supabaseAdmin
      .from('managers')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingManager) {
      return Response.json({ error: 'Manager not found' }, { status: 404 })
    }

    // Определяем company_id для проверки прав
    let targetCompanyId: number | null = null
    
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'admin' && body.company_id) {
      targetCompanyId = parseInt(body.company_id)
    }

    // Проверяем, что менеджер принадлежит нужной компании
    if (targetCompanyId !== null && existingManager.company_id !== targetCompanyId) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No data to update' }, { status: 400 })
    }

    // Обновляем менеджера
    const { data: updatedManager, error: updateError } = await supabaseAdmin
      .from('managers')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user:users(*)
      `)
      .single()

    if (updateError) {
      console.error('Error updating manager:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    // Логируем действие
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: targetCompanyId || existingManager.company_id,
      entity_type: 'manager',
      entity_id: id.toString(),
      action: 'update',
      before_state: existingManager,
      after_state: updatedManager
    })

    return Response.json(updatedManager, { status: 200 })

  } catch (error: any) {
    console.error('Error in PUT /api/managers/[id]:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
