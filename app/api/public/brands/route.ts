import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Публичный API для получения брендов без авторизации
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Получаем бренды, у которых есть доступные автомобили
    const { data: brands, error } = await supabaseAdmin
      .from('car_brands')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('Supabase error fetching brands:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      data: brands || []
    })

  } catch (error) {
    console.error('Internal server error in /api/public/brands:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
