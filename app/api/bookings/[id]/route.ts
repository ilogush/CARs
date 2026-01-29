import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { logAuditAction } from '@/lib/audit-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check permissions - only admin, owner, manager can view bookings
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch booking with related data
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        company_cars(
          id,
          company_id,
          license_plate,
          price_per_day,
          status,
          car_templates(
            car_brands(name),
            car_models(name)
          )
        ),
        users(id, name, surname, email)
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      if (error?.code === 'PGRST116') {
        return Response.json({ error: 'Booking not found' }, { status: 404 })
      }
      console.error('Error fetching booking:', error)
      return Response.json({ error: error?.message || 'Booking not found' }, { status: 500 })
    }

    // Check access - verify booking belongs to user's company
    const bookingCompanyId = booking.company_cars?.company_id
    if (bookingCompanyId) {
      // Determine company_id for access check
      let targetCompanyId: number | null = null
      
      const adminCompanyId = await getAdminModeCompanyId(request)
      if (adminCompanyId) {
        targetCompanyId = adminCompanyId
      } else if (scope.role === 'owner' && scope.company_id) {
        targetCompanyId = scope.company_id
      } else if (scope.role === 'manager' && scope.company_id) {
        targetCompanyId = scope.company_id
      }

      if (targetCompanyId !== null && bookingCompanyId !== targetCompanyId) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Log view action
    const adminCompanyId = await getAdminModeCompanyId(request)
    await logAuditAction(request, {
      entity_type: 'booking',
      entity_id: id,
      action: 'view',
      company_id: adminCompanyId || bookingCompanyId || null
    })

    return Response.json(booking)
  } catch (error: any) {
    console.error('Internal server error in GET /api/bookings/[id]:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
