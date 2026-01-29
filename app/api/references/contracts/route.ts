
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const adminMode = searchParams.get('admin_mode') === 'true'
        const companyId = searchParams.get('company_id')

        const supabase = await createClient()

        // 1. Available Cars (filtered by availability and company)
        let carsQuery = supabase
            .from('company_cars')
            .select('*, car_templates!template_id(*, car_brands(*), car_models(*))')
            .eq('status', 'available')

        if (companyId) {
            carsQuery = carsQuery.eq('company_id', parseInt(companyId))
        }

        // 2. Managers (if company provided)
        let managersQuery = supabase.from('users').select('*').eq('role', 'manager')
        // Note: Managers filter by company usually is in 'managers' table, but here UI calls /api/users with filters.
        // For simplicity, we just fetch users with manager role. UI filter logic is complex.
        // Let's stick to simple "All Managers" or optimize later. Actually, managers are linked to companies via 'managers' table.
        // If company_id is provided, we should filter.
        // But `users` table doesn't have company_id.
        // Let's rely on the separate `usersApi` call in front-end for now if it's complex, OR just return empty here and let frontend fetch.
        // The previous frontend fetched `/api/users?filters={role:manager}`.
        // We will omit managers from this aggregation for now to avoid complexity in this step, or fetch all.

        // 3. Locations
        // If companyId, get districts. Else get locations.
        let locationsData
        if (companyId) {
            const { data: comp } = await supabase.from('companies').select('location_id').eq('id', companyId).single()
            if (comp?.location_id) {
                const { data: dists } = await supabase.from('districts').select('id, name').eq('location_id', comp.location_id)
                locationsData = dists
            }
        } else {
            const { data: locs } = await supabase.from('locations').select('id, name')
            locationsData = locs
        }

        const [carsRes] = await Promise.all([carsQuery])

        return NextResponse.json({
            cars: carsRes.data || [],
            locations: locationsData || [],
            // clients and managers are fetched separately due to potentially large size/custom filtering
        })

    } catch (error: any) {
        console.error('Error in /api/references/contracts:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
