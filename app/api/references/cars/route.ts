
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

import { createCachedResponse, CACHE_CONFIG } from '@/lib/api/performance'

// Cache reference data for 1 hour
export const revalidate = 3600

export async function GET() {
    try {
        const supabase = await createClient()

        const [
            { data: bodyTypes },
            { data: carClasses },
            { data: fuelTypes },
            { data: doorCounts },
            { data: seatCounts },
            { data: transmissionTypes },
            { data: engineVolumes }
        ] = await Promise.all([
            supabase.from('car_body_types').select('*').order('name'),
            supabase.from('car_classes').select('*').order('name'),
            supabase.from('car_fuel_types').select('*').order('name'),
            supabase.from('car_door_counts').select('*').order('count'),
            supabase.from('car_seat_counts').select('*').order('count'),
            supabase.from('car_transmission_types').select('*').order('name'),
            supabase.from('car_engine_volumes').select('*').order('volume')
        ])

        return createCachedResponse(
            {
                bodyTypes: bodyTypes || [],
                carClasses: carClasses || [],
                fuelTypes: fuelTypes || [],
                doorCounts: doorCounts || [],
                seatCounts: seatCounts || [],
                transmissionTypes: transmissionTypes || [],
                engineVolumes: engineVolumes || []
            },
            CACHE_CONFIG.REFERENCE_DATA
        )
    } catch (error) {
        console.error('Error fetching car reference data:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
