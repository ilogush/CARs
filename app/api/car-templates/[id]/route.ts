import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления шаблона авто
const carTemplateUpdateSchema = z.object({
    brand_id: z.number().int().positive('Brand ID must be a positive integer'),
    model_id: z.number().int().positive('Model ID must be a positive integer'),
    body_type_id: z.number().int().positive().optional(),
    car_class_id: z.number().int().positive().optional(),
    fuel_type_id: z.number().int().positive().optional(),
    door_count_id: z.number().int().positive().optional(),
    seat_count_id: z.number().int().positive().optional(),
    transmission_type_id: z.number().int().positive().optional(),
    engine_volume_id: z.number().int().positive().optional(),
    body_type: z.string().optional(), // Для обратной совместимости
    car_class: z.string().optional(), // Для обратной совместимости
    fuel_type: z.string().optional(), // Для обратной совместимости
    body_production_start_year: z.number().int().min(1900).max(new Date().getFullYear() + 1)
})

// GET - получение шаблона авто по ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('car_templates')
            .select(`
        *,
        car_brands (
          id,
          name
        ),
        car_models (
          id,
          name
        ),
        car_body_types (
          id,
          name
        ),
        car_classes (
          id,
          name
        ),
        car_fuel_types (
          id,
          name
        ),
        car_door_counts (
          id,
          count
        ),
        car_seat_counts (
          id,
          count
        ),
        car_transmission_types (
          id,
          name
        ),
        car_engine_volumes (
          id,
          volume
        )
      `)
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Car template not found' }, { status: 404 })
            }
            console.error('Error fetching car template:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Internal server error in GET /api/car-templates/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - обновление шаблона авто
const PUT = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = carTemplateUpdateSchema.parse(body)

            const supabase = await createClient()

            // Проверяем существование шаблона
            const { data: existingTemplate } = await supabase
                .from('car_templates')
                .select(`
          *,
          car_brands (
            id,
            name
          ),
          car_models (
            id,
            name
          ),
        `)
                .eq('id', id)
                .single()

            if (!existingTemplate) {
                return NextResponse.json({ error: 'Car template not found' }, { status: 404 })
            }

            // Проверяем существование бренда
            const { data: brand } = await supabase
                .from('car_brands')
                .select('id')
                .eq('id', validatedData.brand_id)
                .single()

            if (!brand) {
                return NextResponse.json(
                    { error: 'Car brand not found' },
                    { status: 400 }
                )
            }

            // Проверяем существование модели
            const { data: model } = await supabase
                .from('car_models')
                .select('id, brand_id')
                .eq('id', validatedData.model_id)
                .single()

            if (!model) {
                return NextResponse.json(
                    { error: 'Car model not found' },
                    { status: 400 }
                )
            }

            // Проверяем что модель принадлежит указанному бренду
            if (model.brand_id !== validatedData.brand_id) {
                return NextResponse.json(
                    { error: 'Car model does not belong to specified brand' },
                    { status: 400 }
                )
            }

            // Подготавливаем данные для обновления
            const updateData: any = {
                brand_id: validatedData.brand_id,
                model_id: validatedData.model_id,
                body_production_start_year: validatedData.body_production_start_year
            }

            // Добавляем новые поля из справочников
            if (validatedData.body_type_id !== undefined) updateData.body_type_id = validatedData.body_type_id
            if (validatedData.car_class_id !== undefined) updateData.car_class_id = validatedData.car_class_id
            if (validatedData.fuel_type_id !== undefined) updateData.fuel_type_id = validatedData.fuel_type_id
            if (validatedData.door_count_id !== undefined) updateData.door_count_id = validatedData.door_count_id
            if (validatedData.seat_count_id !== undefined) updateData.seat_count_id = validatedData.seat_count_id
            if (validatedData.transmission_type_id !== undefined) updateData.transmission_type_id = validatedData.transmission_type_id
            if (validatedData.engine_volume_id !== undefined) updateData.engine_volume_id = validatedData.engine_volume_id

            // Обратная совместимость со старыми полями
            if (validatedData.body_type) updateData.body_type = validatedData.body_type
            if (validatedData.car_class) updateData.car_class = validatedData.car_class
            if (validatedData.fuel_type) updateData.fuel_type = validatedData.fuel_type

            // Обновляем шаблон авто
            const { data: updatedTemplate, error: updateError } = await supabase
                .from('car_templates')
                .update(updateData)
                .eq('id', id)
                .select(`
          *,
          car_brands (
            id,
            name
          ),
          car_models (
            id,
            name
          )
        `)
                .single()

            if (updateError) {
                console.error('Error updating car template:', updateError)
                return NextResponse.json(
                    { error: updateError.message },
                    { status: 500 }
                )
            }

            // Получаем полный шаблон
            const { data: fullTemplate } = await supabase
                .from('car_templates')
                .select(`
          *,
          car_brands (
            id,
            name
          ),
          car_models (
            id,
            name
          )
        `)
                .eq('id', id)
                .single()

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'car_template',
                entity_id: id,
                action: 'update',
                before_state: existingTemplate,
                after_state: fullTemplate
            })

            return NextResponse.json({ data: fullTemplate })

        } catch (error) {
            console.error('Error in PUT /api/car-templates/[id]:', error)

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
    { resource: 'car_templates', action: 'update', scope: 'system' }
)

// DELETE - удаление шаблона авто
const DELETE = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {

            const supabase = await createClient()

            // Проверяем существование шаблона
            const { data: existingTemplate } = await supabase
                .from('car_templates')
                .select(`
          *,
          car_brands (
            id,
            name
          ),
          car_models (
            id,
            name
          )
        `)
                .eq('id', id)
                .single()

            if (!existingTemplate) {
                return NextResponse.json({ error: 'Car template not found' }, { status: 404 })
            }

            // Проверяем связанные записи (можно добавить проверки для других таблиц)
            // Например, если есть реальные авто компаний, созданные на основе этого шаблона

            // Удаляем шаблон
            const { error } = await supabase
                .from('car_templates')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting car template:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'car_template',
                entity_id: id,
                action: 'delete',
                before_state: existingTemplate
            })

            return NextResponse.json({ success: true })

        } catch (error) {
            console.error('Error in DELETE /api/car-templates/[id]:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'car_templates', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
