import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import HeroSection from '@/components/public/HeroSection'
import CarsCatalog from '@/components/public/CarsCatalog'

export default async function Home() {
  // Загружаем начальные данные для SSR
  let initialCars: any[] = []
  let initialTotal = 0

  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, count, error } = await supabaseAdmin
      .from('company_cars')
      .select(`
        id,
        company_id,
        template_id,
        color_id,
        mileage,
        vin,
        license_plate,
        price_per_day,
        photos,
        description,
        status,
        created_at,
        car_templates(
          id,
          brand_id,
          model_id,
          body_production_start_year,
          car_brands(id, name),
          car_models(id, name),
          car_body_types(id, name),
          car_classes(id, name),
          car_fuel_types(id, name),
          car_door_counts(id, count),
          car_seat_counts(id, count),
          car_transmission_types(id, name),
          car_engine_volumes(id, volume)
        ),
        car_colors(id, name, hex_code),
        companies(id, name)
      `, { count: 'exact' })
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .range(0, 11) // Первые 12 автомобилей

    if (!error && data) {
      initialCars = data
      initialTotal = count || 0
    }
  } catch (error) {
    console.error('Error loading initial cars:', error)
  }

  return (
    <>
      <HeroSection />
      <CarsCatalog initialCars={initialCars} initialTotal={initialTotal} />
    </>
  )
}
