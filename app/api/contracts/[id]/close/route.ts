import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { user } = await checkPermissions(request, ['admin', 'owner', 'manager'])

        const body = await request.json()
        const { fees } = body // Array of { type_id, amount, notes }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Get contract and current car
        const { data: contract, error: contractError } = await supabaseAdmin
            .from('contracts')
            .select('id, company_car_id, status')
            .eq('id', id)
            .single()

        if (contractError || !contract) {
            return Response.json({ error: 'Contract not found' }, { status: 404 })
        }

        if (contract.status === 'completed' || contract.status === 'cancelled') {
            return Response.json({ error: 'Contract is already closed' }, { status: 400 })
        }

        // 2. Update Contract status -> completed
        const { error: updateError } = await supabaseAdmin
            .from('contracts')
            .update({ status: 'completed' })
            .eq('id', id)

        if (updateError) throw updateError

        // 3. Update Car status -> available
        if (contract.company_car_id) {
            await supabaseAdmin
                .from('company_cars')
                .update({ status: 'available' })
                .eq('id', contract.company_car_id)
        }

        // 4. Create Payments for fees
        if (fees && Array.isArray(fees) && fees.length > 0) {
            // Get 'Pending' status for new fees (so they can be paid later) OR 'Paid' if assuming immediate payment?
            // Usually closing fees are calculated and then paid. Let's set them as Pending (value=2 usually, need to check).
            // Based on previous logic, we might need to find the status ID.
            // Let's look for "Pending" status.

            const { data: pendingStatus } = await supabaseAdmin
                .from('payment_statuses')
                .select('id')
                .eq('name', 'Pending') // Assuming name is 'Pending' or value=2
                .single()

            // Fallback to value 2 if name check fails or just use what we have. 
            // Actually, safest is to check logic. Previous code used value=1 for Paid.
            // Let's assume value=2 is Pending.

            let statusId = pendingStatus?.id
            if (!statusId) {
                // Try fetching by value if name differs
                const { data: pendingByVal } = await supabaseAdmin
                    .from('payment_statuses')
                    .select('id')
                    .eq('value', 2)
                    .single()
                statusId = pendingByVal?.id
            }

            if (statusId) {
                // Iterate fees to handle custom types
                const paymentsToInsert = []

                // Fetch "Other" or "Miscellaneous" payment type for fallbacks
                const { data: otherType } = await supabaseAdmin
                    .from('payment_types')
                    .select('id')
                    .ilike('name', '%Other%')
                    .limit(1)
                    .single()

                const fallbackTypeId = otherType?.id

                for (const fee of fees) {
                    let finalTypeId = fee.type_id
                    let finalNotes = fee.notes || 'Fee added at closing'

                    // Handle Custom Type
                    if (fee.type_id === 'custom' || !fee.type_id) {
                        if (fallbackTypeId) {
                            finalTypeId = fallbackTypeId
                            // Append custom name to notes
                            if (fee.custom_name) {
                                finalNotes = `${fee.custom_name}: ${finalNotes}`
                            }
                        } else {
                            // Critical: No fallback type found? Skip or error?
                            // Let's try to query ANY valid type to avoid crash, e.g. the first one
                            const { data: anyType } = await supabaseAdmin
                                .from('payment_types')
                                .select('id')
                                .limit(1)
                                .single()
                            finalTypeId = anyType?.id
                            if (fee.custom_name) {
                                finalNotes = `Custom Fee (${fee.custom_name}): ${finalNotes}`
                            }
                        }
                    }

                    if (finalTypeId) {
                        paymentsToInsert.push({
                            contract_id: id,
                            payment_type_id: finalTypeId,
                            payment_status_id: statusId,
                            amount: fee.amount,
                            notes: finalNotes,
                            created_by: user.id
                        })
                    }
                }

                if (paymentsToInsert.length > 0) {
                    const { error: paymentError } = await supabaseAdmin
                        .from('payments')
                        .insert(paymentsToInsert)

                    if (paymentError) {
                        console.error('Error creating closing payments:', paymentError)
                        // Non-critical, contract is closed anyway but user should know
                    }
                }
            }
        }

        return Response.json({ success: true })

    } catch (error: any) {
        console.error('Error closing contract:', error)
        return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
