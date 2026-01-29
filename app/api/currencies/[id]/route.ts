import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

// Валидация схемы для обновления валюты
const currencyUpdateSchema = z.object({
    code: z.string().min(3).max(3).transform(val => val.toUpperCase()).optional(),
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    symbol: z.string()
        .min(1, 'Symbol is required')
        .max(10, 'Symbol too long')
        .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
        .optional(),
    is_active: z.boolean().optional()
})

// GET - получение валюты по ID
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
            .from('currencies')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Currency not found' }, { status: 404 })
            }
            console.error('Error fetching currency:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Internal server error in GET /api/currencies/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - обновление валюты
const PUT = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = currencyUpdateSchema.parse(body)

            const supabase = await createClient()

            // Проверяем существование валюты
            const { data: existingCurrency } = await supabase
                .from('currencies')
                .select('*')
                .eq('id', id)
                .single()

            if (!existingCurrency) {
                return NextResponse.json({ error: 'Currency not found' }, { status: 404 })
            }

            // Проверяем уникальность кода (если изменился)
            if (validatedData.code && validatedData.code !== existingCurrency.code) {
                const { data: duplicateCurrency } = await supabase
                    .from('currencies')
                    .select('id')
                    .eq('code', validatedData.code)
                    .neq('id', id)
                    .single()

                if (duplicateCurrency) {
                    return NextResponse.json(
                        { error: 'Currency with this code already exists' },
                        { status: 400 }
                    )
                }
            }

            // Проверяем уникальность названия (если изменилось)
            if (validatedData.name && validatedData.name !== existingCurrency.name) {
                const { data: duplicateCurrency } = await supabase
                    .from('currencies')
                    .select('id')
                    .eq('name', validatedData.name)
                    .neq('id', id)
                    .single()

                if (duplicateCurrency) {
                    return NextResponse.json(
                        { error: 'Currency with this name already exists' },
                        { status: 400 }
                    )
                }
            }

            // Проверяем уникальность символа (если изменился)
            if (validatedData.symbol && validatedData.symbol !== existingCurrency.symbol) {
                const { data: duplicateCurrency } = await supabase
                    .from('currencies')
                    .select('id')
                    .eq('symbol', validatedData.symbol)
                    .neq('id', id)
                    .single()

                if (duplicateCurrency) {
                    return NextResponse.json(
                        { error: 'Currency with this symbol already exists' },
                        { status: 400 }
                    )
                }
            }

            // Обновляем валюту
            const { data, error } = await supabase
                .from('currencies')
                .update(validatedData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating currency:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'currency',
                entity_id: id,
                action: 'update',
                before_state: existingCurrency,
                after_state: data
            })

            return NextResponse.json({ data })

        } catch (error) {
            console.error('Error in PUT /api/currencies/[id]:', error)

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
    { resource: 'currencies', action: 'update', scope: 'system' }
)

// DELETE - удаление валюты
const DELETE = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        const { params } = context as { params: Promise<{ id: string }> }
        const { id } = await params
        try {

            const supabase = await createClient()

            // Проверяем существование валюты
            const { data: existingCurrency } = await supabase
                .from('currencies')
                .select('*')
                .eq('id', id)
                .single()

            if (!existingCurrency) {
                return NextResponse.json({ error: 'Currency not found' }, { status: 404 })
            }

            // Проверяем связанные записи (компании, использующие эту валюту)
            const { data: relatedCompanies } = await supabase
                .from('companies')
                .select('id')
                .eq('currency_id', id)
                .limit(1)

            if (relatedCompanies && relatedCompanies.length > 0) {
                return NextResponse.json(
                    { error: 'Cannot delete currency used by companies' },
                    { status: 400 }
                )
            }

            // Удаляем валюту
            const { error } = await supabase
                .from('currencies')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting currency:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'currency',
                entity_id: id,
                action: 'delete',
                before_state: existingCurrency
            })

            return NextResponse.json({ success: true })

        } catch (error) {
            console.error('Error in DELETE /api/currencies/[id]:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'currencies', action: 'delete', scope: 'system' }
)

export { PUT, DELETE }
