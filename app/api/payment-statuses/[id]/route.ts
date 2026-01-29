import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления статуса платежа
const paymentStatusUpdateSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    value: z.number().int().refine(val => [-1, 0, 1].includes(val), {
        message: 'Value must be -1 (refund), 0 (pending), or 1 (payment)'
    }).optional(),
    description: z.string()
        .max(500, 'Description too long')
        .refine((val) => !val || /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    is_active: z.boolean().optional()
})

// GET - получение статуса платежа по ID
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
            .from('payment_statuses')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Payment status not found' }, { status: 404 })
            }
            console.error('Error fetching payment status:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Internal server error in GET /api/payment-statuses/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - обновление статуса платежа
const PUT = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = paymentStatusUpdateSchema.parse(body)

            const supabase = await createClient()

            // Проверяем существование статуса
            const { data: existingStatus } = await supabase
                .from('payment_statuses')
                .select('*')
                .eq('id', id)
                .single()

            if (!existingStatus) {
                return NextResponse.json({ error: 'Payment status not found' }, { status: 404 })
            }

            // Проверяем уникальность названия (если изменилось)
            if (validatedData.name && validatedData.name !== existingStatus.name) {
                const { data: duplicateStatus } = await supabase
                    .from('payment_statuses')
                    .select('id')
                    .eq('name', validatedData.name)
                    .neq('id', id)
                    .single()

                if (duplicateStatus) {
                    return NextResponse.json(
                        { error: 'Payment status with this name already exists' },
                        { status: 400 }
                    )
                }
            }

            // Обновляем статус платежа
            const { data, error } = await supabase
                .from('payment_statuses')
                .update(validatedData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating payment status:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'payment_status',
                entity_id: id,
                action: 'update',
                before_state: existingStatus,
                after_state: data
            })

            return NextResponse.json({ data })

        } catch (error) {
            console.error('Error in PUT /api/payment-statuses/[id]:', error)

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
    { resource: 'payment_statuses', action: 'update', scope: 'system' }
)

// DELETE - удаление статуса платежа
const DELETE = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {

            const supabase = await createClient()

            // Проверяем существование статуса
            const { data: existingStatus } = await supabase
                .from('payment_statuses')
                .select('*')
                .eq('id', id)
                .single()

            if (!existingStatus) {
                return NextResponse.json({ error: 'Payment status not found' }, { status: 404 })
            }

            // Проверяем связанные записи (платежи, использующие этот статус)
            const { data: relatedPayments } = await supabase
                .from('payments')
                .select('id')
                .eq('status_id', id)
                .limit(1)

            if (relatedPayments && relatedPayments.length > 0) {
                return NextResponse.json(
                    { error: 'Cannot delete payment status used by payments' },
                    { status: 400 }
                )
            }

            // Удаляем статус платежа
            const { error } = await supabase
                .from('payment_statuses')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting payment status:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'payment_status',
                entity_id: id,
                action: 'delete',
                before_state: existingStatus
            })

            return NextResponse.json({ success: true })

        } catch (error) {
            console.error('Error in DELETE /api/payment-statuses/[id]:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'payment_statuses', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
