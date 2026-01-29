import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { logAuditAction } from '@/lib/audit-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserScope(user)
    const adminCompanyId = await getAdminModeCompanyId(request)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: car, error } = await supabaseAdmin
      .from('company_cars')
      .select(`
        *,
        car_templates(
          *,
          car_brands(name),
          car_models(name),
          car_body_types(name),
          car_classes(name),
          car_fuel_types(name),
          car_door_counts(count),
          car_seat_counts(count),
          car_transmission_types(name),
          car_engine_volumes(volume)
        ),
        car_colors(name, hex_code),
        companies(id, name)
      `)
      .eq('id', id)
      .single()

    if (error || !car) {
      return Response.json({ error: 'Car not found' }, { status: 404 })
    }

    // Check access rights
    let hasAccess = false

    if (scope.role === 'admin') {
      hasAccess = true
    } else if (adminCompanyId && car.company_id === adminCompanyId) {
      hasAccess = true
    } else if (scope.role === 'owner' && scope.company_id === car.company_id) {
      hasAccess = true
    } else if (scope.role === 'manager' && scope.company_id === car.company_id) {
      hasAccess = true
    }

    if (!hasAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Log view action
    await logAuditAction(request, {
      entity_type: 'company_car',
      entity_id: id,
      action: 'view',
      company_id: adminCompanyId || car.company_id || null
    })

    return Response.json(car)

  } catch (error) {
    console.error('Error fetching company car:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserScope(user)
    const adminCompanyId = await getAdminModeCompanyId(request)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get existing car
    const { data: existingCar, error: fetchError } = await supabaseAdmin
      .from('company_cars')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingCar) {
      return Response.json({ error: 'Car not found' }, { status: 404 })
    }

    // Check access rights
    let hasAccess = false

    if (scope.role === 'admin') {
      hasAccess = true
    } else if (adminCompanyId && existingCar.company_id === adminCompanyId) {
      hasAccess = true
    } else if (scope.role === 'owner' && scope.company_id === existingCar.company_id) {
      hasAccess = true
    }

    if (!hasAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}

    if (body.color_id !== undefined) updateData.color_id = body.color_id
    if (body.mileage !== undefined) updateData.mileage = parseInt(body.mileage)
    if (body.next_oil_change_mileage !== undefined) updateData.next_oil_change_mileage = body.next_oil_change_mileage ? parseInt(body.next_oil_change_mileage) : null
    if (body.vin !== undefined) updateData.vin = body.vin || null
    if (body.license_plate !== undefined) updateData.license_plate = body.license_plate.trim()
    if (body.year !== undefined) updateData.year = body.year
    if (body.price_per_day !== undefined) updateData.price_per_day = parseFloat(body.price_per_day)
    if (body.deposit !== undefined) updateData.deposit = parseFloat(body.deposit) || 0
    if (body.daily_mileage_limit !== undefined) updateData.daily_mileage_limit = body.daily_mileage_limit ? parseInt(body.daily_mileage_limit) : null
    if (body.min_rental_days !== undefined) updateData.min_rental_days = body.min_rental_days ? parseInt(body.min_rental_days) : 1
    if (body.photos !== undefined) updateData.photos = body.photos || []
    if (body.document_photos !== undefined) updateData.document_photos = body.document_photos || []
    if (body.insurance_expiry !== undefined) updateData.insurance_expiry = body.insurance_expiry || null
    if (body.registration_expiry !== undefined) updateData.registration_expiry = body.registration_expiry || null
    if (body.insurance_type !== undefined) updateData.insurance_type = body.insurance_type || null
    if (body.price_per_month !== undefined) updateData.price_per_month = body.price_per_month || null
    if (body.marketing_headline !== undefined) updateData.marketing_headline = body.marketing_headline || null
    if (body.featured_image_index !== undefined) updateData.featured_image_index = body.featured_image_index || 0
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.status !== undefined) updateData.status = body.status
    if (body.seasonal_prices !== undefined) updateData.seasonal_prices = body.seasonal_prices || []

    const { data: updatedCar, error } = await supabaseAdmin
      .from('company_cars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company car:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: existingCar.company_id,
      entity_type: 'company_car',
      entity_id: id,
      action: 'update',
      before_state: existingCar,
      after_state: updatedCar
    })

    return Response.json(updatedCar)

  } catch (error) {
    console.error('Error updating company car:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserScope(user)
    const adminCompanyId = await getAdminModeCompanyId(request)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get existing car
    const { data: existingCar, error: fetchError } = await supabaseAdmin
      .from('company_cars')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingCar) {
      return Response.json({ error: 'Car not found' }, { status: 404 })
    }

    // Check access rights
    let hasAccess = false

    if (scope.role === 'admin') {
      hasAccess = true
    } else if (adminCompanyId && existingCar.company_id === adminCompanyId) {
      hasAccess = true
    } else if (scope.role === 'owner' && scope.company_id === existingCar.company_id) {
      hasAccess = true
    }

    if (!hasAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('company_cars')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting company car:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: scope.role,
      company_id: existingCar.company_id,
      entity_type: 'company_car',
      entity_id: id,
      action: 'delete',
      before_state: existingCar
    })

    return Response.json({ success: true })

  } catch (error) {
    console.error('Error deleting company car:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
