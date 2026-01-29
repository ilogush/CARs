import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления района
const districtUpdateSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    location_id: z.number().int().positive('Location ID must be a positive integer').optional(),
    price_per_day: z.number().nonnegative('Price must be non-negative').optional().nullable(),
    is_active: z.boolean().optional().nullable()
})

// GET - получение района по ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('districts')
            .select(`
        *,
        locations (
          id,
          name
        )
      `)
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'District not found' }, { status: 404 })
            }
            console.error('Error fetching district:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Internal server error in GET /api/districts/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - обновление района
const PUT = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = districtUpdateSchema.parse(body)

            const supabase = await createClient()

            // Проверяем существование района
            const { data: existingDistrict } = await supabase
                .from('districts')
                .select(`
          *,
          locations (
            id,
            name
          )
        `)
                .eq('id', id)
                .single()

            if (!existingDistrict) {
                return NextResponse.json({ error: 'District not found' }, { status: 404 })
            }

            // Проверяем существование локации (если изменилась)
            if (validatedData.location_id && validatedData.location_id !== existingDistrict.location_id) {
                const { data: location } = await supabase
                    .from('locations')
                    .select('id')
                    .eq('id', validatedData.location_id)
                    .single()

                if (!location) {
                    return NextResponse.json(
                        { error: 'Location not found' },
                        { status: 400 }
                    )
                }
            }

            // Проверяем уникальность названия (если изменилось)
            const newName = validatedData.name ? validatedData.name.trim() : existingDistrict.name
            const newLocationId = validatedData.location_id ?? existingDistrict.location_id
            if (newName !== existingDistrict.name || newLocationId !== existingDistrict.location_id) {
                const { data: duplicateDistrict } = await supabase
                    .from('districts')
                    .select('id')
                    .eq('name', newName)
                    .eq('location_id', newLocationId)
                    .neq('id', id)
                    .single()

                if (duplicateDistrict) {
                    return NextResponse.json(
                        { error: 'District with this name already exists in this location' },
                        { status: 400 }
                    )
                }
            }

            // Обновляем район
            const { data, error } = await supabase
                .from('districts')
                .update(validatedData)
                .eq('id', id)
                .select(`
          *,
          locations (
            id,
            name
          )
        `)
                .single()

            if (error) {
                console.error('Error updating district:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'district',
                entity_id: id,
                action: 'update',
                before_state: existingDistrict,
                after_state: data
            })

            return NextResponse.json({ data })

        } catch (error) {
            console.error('Error in PUT /api/districts/[id]:', error)

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
    { resource: 'districts', action: 'update', scope: 'system' }
)

// DELETE - удаление района
const DELETE = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {

            const supabase = await createClient()

            // Проверяем существование района
            const { data: existingDistrict } = await supabase
                .from('districts')
                .select('*')
                .eq('id', id)
                .single()

            if (!existingDistrict) {
                return NextResponse.json({ error: 'District not found' }, { status: 404 })
            }

            // Проверяем связанные записи (можно добавить проверки для других таблиц)
            // Например, если есть компании или машины, привязанные к району

            // Удаляем район
            const { error } = await supabase
                .from('districts')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting district:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'district',
                entity_id: id,
                action: 'delete',
                before_state: existingDistrict
            })

            return NextResponse.json({ success: true })

        } catch (error) {
            console.error('Error in DELETE /api/districts/[id]:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'districts', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
