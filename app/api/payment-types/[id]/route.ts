import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления типа платежа
const paymentTypeUpdateSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    sign: z.enum(['+', '-']).optional().refine((val) => val === '+' || val === '-', {
        message: 'Sign must be either + or -'
    }),
    description: z.string()
        .max(500, 'Description too long')
        .refine((val) => !val || /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    is_active: z.boolean().optional()
})

// GET - получение типа платежа по ID
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
            .from('payment_types')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Payment type not found' }, { status: 404 })
            }
            console.error('Error fetching payment type:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Проверяем использование типа в системе
        const { data: usageLogs } = await supabase
            .from('audit_logs')
            .select('id')
            .eq('entity_type', 'payment_type')
            .eq('entity_id', id)
            .limit(1)

        const isUsed = usageLogs && usageLogs.length > 0

        return NextResponse.json({ 
            data: {
                ...data,
                is_used: isUsed
            }
        })

    } catch (error) {
        console.error('Internal server error in GET /api/payment-types/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - обновление типа платежа
const PUT = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = paymentTypeUpdateSchema.parse(body)

            const supabase = await createClient()

            // Проверяем существование типа
            const { data: existingType } = await supabase
                .from('payment_types')
                .select('*')
                .eq('id', id)
                .single()

            if (!existingType) {
                return NextResponse.json({ error: 'Payment type not found' }, { status: 404 })
            }

            // Проверяем использование типа в системе (через audit_logs)
            const { data: usageLogs } = await supabase
                .from('audit_logs')
                .select('id')
                .eq('entity_type', 'payment_type')
                .eq('entity_id', id)
                .limit(1)

            const isUsed = usageLogs && usageLogs.length > 0

            // Если тип используется, нельзя изменять Sign и Status
            if (isUsed) {
                if (validatedData.sign !== undefined && validatedData.sign !== existingType.sign) {
                    return NextResponse.json(
                        { error: 'Cannot change Sign for payment type that is used in the system' },
                        { status: 400 }
                    )
                }
                if (validatedData.is_active !== undefined && validatedData.is_active !== existingType.is_active) {
                    return NextResponse.json(
                        { error: 'Cannot change Status for payment type that is used in the system' },
                        { status: 400 }
                    )
                }
            }

            // Проверяем уникальность названия (если изменилось)
            if (validatedData.name && validatedData.name !== existingType.name) {
                const { data: duplicateType } = await supabase
                    .from('payment_types')
                    .select('id')
                    .eq('name', validatedData.name)
                    .neq('id', id)
                    .single()

                if (duplicateType) {
                    return NextResponse.json(
                        { error: 'Payment type with this name already exists' },
                        { status: 400 }
                    )
                }
            }

            // Обновляем тип платежа
            const { data, error } = await supabase
                .from('payment_types')
                .update(validatedData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating payment type:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'payment_type',
                entity_id: id,
                action: 'update',
                before_state: existingType,
                after_state: data
            })

            return NextResponse.json({ data })

        } catch (error) {
            console.error('Error in PUT /api/payment-types/[id]:', error)

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
    { resource: 'payment_types', action: 'update', scope: 'system' }
)

// DELETE - удаление типа платежа
const DELETE = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {

            const supabase = await createClient()

            // Проверяем существование типа
            const { data: existingType } = await supabase
                .from('payment_types')
                .select('*')
                .eq('id', id)
                .single()

            if (!existingType) {
                return NextResponse.json({ error: 'Payment type not found' }, { status: 404 })
            }

            // Проверяем использование типа в системе (через audit_logs)
            const { data: usageLogs } = await supabase
                .from('audit_logs')
                .select('id')
                .eq('entity_type', 'payment_type')
                .eq('entity_id', id)
                .limit(1)

            const isUsed = usageLogs && usageLogs.length > 0

            if (isUsed) {
                return NextResponse.json(
                    { error: 'Cannot delete payment type that is used in the system' },
                    { status: 400 }
                )
            }

            // Удаляем тип платежа
            const { error } = await supabase
                .from('payment_types')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting payment type:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'payment_type',
                entity_id: id,
                action: 'delete',
                before_state: existingType
            })

            return NextResponse.json({ success: true })

        } catch (error) {
            console.error('Error in DELETE /api/payment-types/[id]:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'payment_types', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
