import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'

const deliveryPriceSchema = z.array(z.object({
    district_id: z.number(),
    price: z.number().nonnegative(),
    is_active: z.boolean().optional()
}))

// GET - Получить все районы с ценами для конкретной компании
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: companyIdStr } = await params
        const companyId = parseInt(companyIdStr)
        const supabase = await createClient()

        // Получаем все районы для локации компании
        const { data: companyData } = await supabase
            .from('companies')
            .select('location_id')
            .eq('id', companyId)
            .single()

        if (!companyData) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        const { data: districts } = await supabase
            .from('districts')
            .select('*')
            .eq('location_id', companyData.location_id)
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (!districts) {
            return NextResponse.json({ data: [] })
        }

        // Получаем цены компании
        const { data: prices } = await supabase
            .from('company_delivery_prices')
            .select('*')
            .eq('company_id', companyId)

        // Объединяем
        const results = districts.map(district => {
            const priceEntry = prices?.find(p => p.district_id === district.id)
            return {
                district_id: district.id,
                name: district.name,
                price: priceEntry ? priceEntry.price : null, // null means not set
                is_active: priceEntry ? priceEntry.is_active : false,
                delivery_price_id: priceEntry?.id
            }
        })

        return NextResponse.json({ data: results })
    } catch (error: any) {
        console.error('Error fetching delivery prices:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - Сохранить цены (upsert)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: companyIdStr } = await params
        const companyId = parseInt(companyIdStr)
        const body = await request.json()

        const validatedData = deliveryPriceSchema.parse(body)
        const supabase = await createClient()

        // Validate at least one price is 0
        const hasFreeDelivery = validatedData.some(p => p.is_active && p.price === 0)
        if (!hasFreeDelivery) {
            return NextResponse.json({ error: 'At least one active district must have zero delivery cost (Free Delivery)' }, { status: 400 })
        }

        // Perform upsert
        const upsertData = validatedData.map(item => ({
            company_id: companyId,
            district_id: item.district_id,
            price: item.price,
            is_active: item.is_active === undefined ? true : item.is_active,
            updated_at: new Date().toISOString()
        }))

        const { error } = await supabase
            .from('company_delivery_prices')
            .upsert(upsertData, {
                onConflict: 'company_id,district_id'
            })

        if (error) {
            console.error('Error upserting delivery prices:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Audit log
        const { logAuditAction } = await import('@/lib/audit-middleware')
        await logAuditAction(request, {
            entity_type: 'company_delivery_prices',
            entity_id: companyIdStr,
            action: 'update',
            after_state: { prices: upsertData },
            company_id: companyId
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error saving delivery prices:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
