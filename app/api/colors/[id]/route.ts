import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления цвета
const colorUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
  hex_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex code format (use #RRGGBB)')
})

// GET - получение цвета по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const colorId = parseInt(id)

    if (isNaN(colorId)) {
      return NextResponse.json({ error: 'Invalid color ID' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('car_colors')
      .select('*')
      .eq('id', colorId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Color not found' }, { status: 404 })
      }
      console.error('Error fetching color:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('Internal server error in GET /api/colors/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - обновление цвета
const PUT = withAuth(
  async (request: NextRequest, context: any): Promise<NextResponse> => {
    const { params } = context as { params: Promise<{ id: string }> }
    const { id } = await params
    try {
      const colorId = parseInt(id)

      if (isNaN(colorId)) {
        return NextResponse.json({ error: 'Invalid color ID' }, { status: 400 })
      }

      const body = await request.json()

      // Валидация данных
      const validatedData = colorUpdateSchema.parse(body)

      const supabase = await createClient()

      // Проверяем существование цвета
      const { data: existingColor } = await supabase
        .from('car_colors')
        .select('*')
        .eq('id', colorId)
        .single()

      if (!existingColor) {
        return NextResponse.json({ error: 'Color not found' }, { status: 404 })
      }

      // Проверяем уникальность названия (если оно изменилось)
      if (validatedData.name !== existingColor.name) {
        const { data: duplicateColor } = await supabase
          .from('car_colors')
          .select('id')
          .eq('name', validatedData.name)
          .single()

        if (duplicateColor) {
          return NextResponse.json(
            { error: 'Color with this name already exists' },
            { status: 400 }
          )
        }
      }

      // Обновляем цвет
      const { data, error } = await supabase
        .from('car_colors')
        .update(validatedData)
        .eq('id', colorId)
        .select()
        .single()

      if (error) {
        console.error('Error updating color:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      // Логируем действие
      await (await import('@/lib/audit-middleware')).logAuditAction(request, {
        entity_type: 'color',
        entity_id: colorId.toString(),
        action: 'update',
        before_state: existingColor,
        after_state: data
      })

      return NextResponse.json({ data })

    } catch (error) {
      console.error('Error in PUT /api/colors/[id]:', error)

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { resource: 'colors', action: 'update', scope: 'system' }
)

// DELETE - удаление цвета
const DELETE = withAuth(
  async (request: NextRequest, context: any): Promise<NextResponse> => {
    const { params } = context as { params: Promise<{ id: string }> }
    const { id } = await params
    try {
      const colorId = parseInt(id || '0')

      if (isNaN(colorId)) {
        return NextResponse.json({ error: 'Invalid color ID' }, { status: 400 })
      }

      const supabase = await createClient()

      // Проверяем существование цвета
      const { data: existingColor, error: fetchError } = await supabase
        .from('car_colors')
        .select('*')
        .eq('id', colorId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Color not found' }, { status: 404 })
        }
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      if (!existingColor) {
        return NextResponse.json({ error: 'Color not found' }, { status: 404 })
      }

      // Удаляем цвет
      const { error } = await supabase
        .from('car_colors')
        .delete()
        .eq('id', colorId)

      if (error) {
        console.error('Error deleting color:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      // Логируем действие
      await (await import('@/lib/audit-middleware')).logAuditAction(request, {
        entity_type: 'color',
        entity_id: colorId.toString(),
        action: 'delete',
        before_state: existingColor
      })

      return NextResponse.json({ success: true })

    } catch (error) {
      console.error('Error in DELETE /api/colors/[id]:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { resource: 'colors', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
