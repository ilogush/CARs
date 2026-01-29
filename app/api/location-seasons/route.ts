import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPermissions } from '@/lib/rbac-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return Response.json({ error: 'locationId is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('location_seasons')
            .select('*')
            .eq('location_id', parseInt(locationId))
            .order('start_date', { ascending: true })

        if (error) {
            return Response.json({ error: error.message }, { status: 500 })
        }

        return Response.json({ data })
    } catch (error) {
        console.error('Error in GET /api/location-seasons:', error)
        return Response.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user, scope } = await checkPermissions(request, ['admin'])
        const body = await request.json()
        const { locationId, seasons } = body

        if (!locationId || !seasons) {
            return Response.json({ error: 'locationId and seasons are required' }, { status: 400 })
        }

        const supabase = await createClient()

        // Replace all seasons for this location
        const { error: deleteError } = await supabase
            .from('location_seasons')
            .delete()
            .eq('location_id', parseInt(locationId))

        if (deleteError) {
            return Response.json({ error: deleteError.message }, { status: 500 })
        }

        if (seasons.length === 0) {
            return Response.json({ data: [] })
        }

        const seasonsToInsert = seasons.map((s: any) => ({
            location_id: parseInt(locationId),
            name: s.name,
            start_date: s.start_date,
            end_date: s.end_date,
            price_coefficient: s.price_coefficient
        }))

        const { data, error: insertError } = await supabase
            .from('location_seasons')
            .insert(seasonsToInsert)
            .select()

        if (insertError) {
            console.error('Error inserting seasons:', insertError)
            return Response.json({ error: insertError.message }, { status: 500 })
        }

        // Audit Log
        try {
            const { logAuditAction } = await import('@/lib/audit-middleware')
            await logAuditAction(request, {
                entity_type: 'location_season',
                entity_id: locationId,
                action: 'update',
                after_state: { location_id: locationId, seasons: data }
            })
        } catch (auditError) {
            console.error('Failed to log audit action:', auditError)
        }

        return Response.json({ data })
    } catch (error) {
        console.error('Error in POST /api/location-seasons:', error)
        return Response.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
