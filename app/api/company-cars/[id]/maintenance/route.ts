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
        const { performed_at_mileage, next_interval, notes, service_date } = body

        if (!performed_at_mileage || !next_interval) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Calculate next due logical
        const nextDue = performed_at_mileage + next_interval

        // Update Car
        const { error: updateError } = await supabaseAdmin
            .from('company_cars')
            .update({
                next_oil_change_mileage: nextDue,
                // We might validly update current mileage too if it's higher
                mileage: performed_at_mileage
            })
            .eq('id', id)

        if (updateError) throw updateError

        // Log the maintenance action
        // Using audit_logs or dedicated maintenance table if exists. 
        // Assuming audit_logs is the standard way for now.
        // Or we could create a 'car_notes' entry if we want visibility.
        // For now, let's keep it simple: just update the car counters. 
        // The user asked for "Log action". I'll use `audit_logs`.

        await supabaseAdmin.from('audit_logs').insert({
            user_id: user.id,
            action: 'maintenance_performed',
            entity_type: 'company_cars',
            entity_id: id,
            details: {
                service_date,
                performed_at_mileage,
                next_interval,
                next_due: nextDue,
                notes
            }
        })

        return Response.json({ success: true, next_due: nextDue })

    } catch (error: any) {
        console.error('Error recording maintenance:', error)
        return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
