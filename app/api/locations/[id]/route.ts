import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления локации
const locationUpdateSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
})

// GET - получение локации по ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const locationId = parseInt(id)

        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('id', locationId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Location not found' }, { status: 404 })
            }
            console.error('Error fetching location:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Internal server error in GET /api/locations/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - обновление локации
const PUT = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const locationId = parseInt(id)

            if (isNaN(locationId)) {
                return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 })
            }

            const body = await request.json()

            // Валидация данных
            const validatedData = locationUpdateSchema.parse(body)

            const supabase = await createClient()

            // Проверяем существование локации
            const { data: existingLocation } = await supabase
                .from('locations')
                .select('*')
                .eq('id', locationId)
                .single()

            if (!existingLocation) {
                return NextResponse.json({ error: 'Location not found' }, { status: 404 })
            }

            // Проверяем уникальность названия (если оно изменилось)
            if (validatedData.name !== existingLocation.name) {
                const { data: duplicateLocation } = await supabase
                    .from('locations')
                    .select('id')
                    .eq('name', validatedData.name)
                    .single()

                if (duplicateLocation) {
                    return NextResponse.json(
                        { error: 'Location with this name already exists' },
                        { status: 400 }
                    )
                }
            }

            // Обновляем локацию
            const { data, error } = await supabase
                .from('locations')
                .update(validatedData)
                .eq('id', locationId)
                .select()
                .single()

            if (error) {
                console.error('Error updating location:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'location',
                entity_id: locationId.toString(),
                action: 'update',
                before_state: existingLocation,
                after_state: data
            })

            return NextResponse.json({ data })

        } catch (error) {
            console.error('Error in PUT /api/locations/[id]:', error)

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
    { resource: 'locations', action: 'update', scope: 'system' }
)

// DELETE - удаление локации
const DELETE = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const locationId = parseInt(id || '0')


            if (isNaN(locationId)) {
                console.error('Invalid location ID:', id)
                return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 })
            }

            const supabase = await createClient()

            // Проверяем существование локации
            const { data: existingLocation, error: fetchError } = await supabase
                .from('locations')
                .select('*')
                .eq('id', locationId)
                .single()

            if (fetchError) {
                console.error('Error fetching location:', fetchError)
                if (fetchError.code === 'PGRST116') {
                    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
                }
                return NextResponse.json({ error: fetchError.message }, { status: 500 })
            }

            if (!existingLocation) {
                console.error('Location not found:', locationId)
                return NextResponse.json({ error: 'Location not found' }, { status: 404 })
            }


            // Проверяем связанные записи
            const { data: relatedCompanies } = await supabase
                .from('companies')
                .select('id')
                .eq('location_id', locationId)
                .limit(1)

            if (relatedCompanies && relatedCompanies.length > 0) {
                return NextResponse.json(
                    { error: 'Cannot delete location with associated companies' },
                    { status: 400 }
                )
            }

            const { data: relatedDistricts } = await supabase
                .from('districts')
                .select('id')
                .eq('location_id', locationId)
                .limit(1)

            if (relatedDistricts && relatedDistricts.length > 0) {
                return NextResponse.json(
                    { error: 'Cannot delete location with associated districts' },
                    { status: 400 }
                )
            }


            // Удаляем локацию
            const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', locationId)

            if (error) {
                console.error('Error deleting location:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }


            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'location',
                entity_id: locationId.toString(),
                action: 'delete',
                before_state: existingLocation
            })

            return NextResponse.json({ success: true })

        } catch (error) {
            console.error('Error in DELETE /api/locations/[id]:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'locations', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
