import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления модели
const carModelUpdateSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'),
    brand_id: z.number().int().positive('Brand ID must be a positive integer')
})

// GET - получение модели по ID
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
            .from('car_models')
            .select(`
        *,
        car_brands (
          id,
          name
        )
      `)
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Car model not found' }, { status: 404 })
            }
            const { formatErrorMessage } = await import('@/lib/error-handler')
            return NextResponse.json({ error: formatErrorMessage(error) }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (error) {
        const { formatErrorMessage } = await import('@/lib/error-handler')
        return NextResponse.json(
            { error: formatErrorMessage(error) },
            { status: 500 }
        )
    }
}

// PUT - обновление модели
const PUT = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = carModelUpdateSchema.parse(body)

            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            // Обновляем модель через RPC (атомарно с аудитом и проверкой уникальности)
            const { data, error } = await supabase.rpc('update_car_model', {
                p_id: parseInt(id),
                p_brand_id: validatedData.brand_id,
                p_name: validatedData.name,
                p_updated_at: body.updated_at, // Optimistic Lock
                p_user_id: user.id,
                p_audit_metadata: {
                    ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
                    user_agent: request.headers.get('user-agent') || 'unknown'
                }
            })

            if (error) {
                const { formatErrorMessage } = await import('@/lib/error-handler')
                let status = 500
                if (error.code === '23505') status = 400
                if (error.code === '40001') status = 409

                return NextResponse.json(
                    { error: formatErrorMessage(error) },
                    { status }
                )
            }

            return NextResponse.json({ data })

        } catch (error) {
            const { formatErrorMessage } = await import('@/lib/error-handler')

            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    { error: 'Validation failed', details: error.issues },
                    { status: 400 }
                )
            }

            return NextResponse.json(
                { error: formatErrorMessage(error) },
                { status: 500 }
            )
        }
    },
    { resource: 'car_models', action: 'update', scope: 'system' }
)

// DELETE - удаление модели
const DELETE = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            // Удаляем модель через RPC (атомарно с проверкой зависимостей и Soft Delete)
            const { error } = await supabase.rpc('delete_car_model', {
                p_id: parseInt(id),
                p_user_id: user.id,
                p_audit_metadata: {
                    ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
                    user_agent: request.headers.get('user-agent') || 'unknown'
                }
            })

            if (error) {
                const { formatErrorMessage } = await import('@/lib/error-handler')
                return NextResponse.json(
                    { error: formatErrorMessage(error) },
                    { status: (error.code === '23503' || error.message.includes('templates')) ? 400 : 500 }
                )
            }

            return NextResponse.json({ success: true })

        } catch (error) {
            const { formatErrorMessage } = await import('@/lib/error-handler')
            return NextResponse.json(
                { error: formatErrorMessage(error) },
                { status: 500 }
            )
        }
    },
    { resource: 'car_models', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
