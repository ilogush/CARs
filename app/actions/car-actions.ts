'use server'

import { createClient } from '@/lib/supabase/server'
import { carSchema, CarFormData } from '@/lib/validations/car'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { CACHE_TAGS } from '@/lib/cache-tags'

export async function upsertCar(data: CarFormData, carId?: number) {
  // ... existing code ...
  const supabase = await createClient()

  // 1. Check Auth & Role
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check role
  const { data: userData, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleError || !userData || userData.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }

  // 2. Validate Data
  const result = carSchema.safeParse(data)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || 'Invalid data')
  }
  const validData = result.data

  // 3. Handle Brand/Model
  let brandModelId: number

  // Check if exists
  const { data: existingBrandModel } = await supabase
    .from('car_brand_models')
    .select('id')
    .ilike('brand', validData.brand)
    .ilike('model', validData.model)
    .maybeSingle()

  if (existingBrandModel) {
    brandModelId = existingBrandModel.id
  } else {
    // Create new
    const firstLocationId = validData.location_ids[0]

    const { data: newBrandModel, error: createBrandError } = await supabase
      .from('car_brand_models')
      .insert({
        brand: validData.brand,
        model: validData.model,
        location_id: firstLocationId,
      })
      .select('id')
      .single()

    if (createBrandError) {
      throw new Error('Failed to create Brand/Model')
    }
    brandModelId = newBrandModel.id
  }

  // 4. Handle Brand Locations
  if (validData.location_ids.length > 0) {
    const locationInserts = validData.location_ids.map(locId => ({
      brand_model_id: brandModelId,
      location_id: locId
    }))

    const { error: locError } = await supabase
      .from('brand_locations')
      .upsert(locationInserts, { onConflict: 'brand_model_id,location_id' })

    if (locError) {
      throw new Error('Failed to update brand locations')
    }
  }

  // 5. Insert/Update Car
  const carPayload = {
    company_id: validData.company_id,
    brand_model_id: brandModelId,
    year: validData.year,
    doors: validData.doors,
    body_type: validData.body_type,
    engine_volume: validData.engine_volume,
    color: validData.color,
    price_per_day: validData.price_per_day,
    seats: validData.seats,
    transmission: validData.transmission,
    status: validData.status,
    description: validData.description || null,
    photos: validData.photos || []
  }

  if (carId) {
    const { error: updateError } = await supabase
      .from('car_items')
      .update(carPayload)
      .eq('id', carId)

    if (updateError) {
      throw new Error('Failed to update car: ' + updateError.message)
    }
  } else {
    const { error: insertError } = await supabase
      .from('car_items')
      .insert(carPayload)

    if (insertError) {
      throw new Error('Failed to create car: ' + insertError.message)
    }
  }

  revalidatePath('/dashboard/cars')
  updateTag(CACHE_TAGS.DASHBOARD_STATS)
  updateTag(CACHE_TAGS.COMPANY_STATS)
  redirect('/dashboard/cars')
}

export async function createBrandModel(input: { brand: string; model: string; location_id: number }) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: userData, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleError || !userData || userData.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }

  const brand = input.brand.trim()
  const model = input.model.trim()
  const locationId = input.location_id

  if (!brand) throw new Error('Brand is required')
  if (!model) throw new Error('Model is required')
  if (!locationId) throw new Error('Location is required')

  const { data: existing } = await supabase
    .from('car_brand_models')
    .select('id, brand, model')
    .eq('location_id', locationId)
    .ilike('brand', brand)
    .ilike('model', model)
    .maybeSingle()

  if (existing) {
    return existing
  }

  const { data: created, error: createError } = await supabase
    .from('car_brand_models')
    .insert({ brand, model, location_id: locationId })
    .select('id, brand, model')
    .single()

  if (createError) {
    throw new Error(createError.message)
  }

  const { error: linkError } = await supabase
    .from('brand_locations')
    .upsert([{ brand_model_id: created.id, location_id: locationId }], { onConflict: 'brand_model_id,location_id' })

  if (linkError) {
    throw new Error(linkError.message)
  }

  updateTag(CACHE_TAGS.REFERENCE_DATA)
  return created
}

