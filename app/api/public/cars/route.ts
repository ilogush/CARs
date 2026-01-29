import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Публичный API для получения доступных автомобилей без авторизации
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null
    const filters = JSON.parse(searchParams.get('filters') || '{}')

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Подготовка фильтров для шаблонов
    let templateIds: number[] | null = null

    // Фильтр по бренду
    if (filters.brand_id) {
      const { data: templates } = await supabaseAdmin
        .from('car_templates')
        .select('id')
        .eq('brand_id', filters.brand_id)

      const ids = templates?.map(t => t.id) || []
      templateIds = ids.length > 0 ? ids : []
    }

    // Фильтр по модели
    if (filters.model_id) {
      const { data: templates } = await supabaseAdmin
        .from('car_templates')
        .select('id')
        .eq('model_id', filters.model_id)

      const ids = templates?.map(t => t.id) || []
      if (templateIds) {
        // Пересечение с предыдущими фильтрами
        templateIds = templateIds.filter(id => ids.includes(id))
      } else {
        templateIds = ids.length > 0 ? ids : []
      }
    }

    // Фильтр по типу кузова
    if (filters.body_type_id) {
      const { data: templates } = await supabaseAdmin
        .from('car_templates')
        .select('id')
        .eq('body_type_id', filters.body_type_id)

      const ids = templates?.map(t => t.id) || []
      if (templateIds) {
        // Пересечение с предыдущими фильтрами
        templateIds = templateIds.filter(id => ids.includes(id))
      } else {
        templateIds = ids.length > 0 ? ids : []
      }
    }

    // Поиск по тексту (бренд, модель, описание)
    if (filters.q) {
      const val = (filters.q as string).trim()

      if (val) {
        // Поиск по брендам и моделям через car_brands и car_models
        const { data: brands } = await supabaseAdmin
          .from('car_brands')
          .select('id')
          .ilike('name', '%' + val + '%')

        const { data: models } = await supabaseAdmin
          .from('car_models')
          .select('id')
          .ilike('name', '%' + val + '%')

        const brandIds = brands?.map(b => b.id) || []
        const modelIds = models?.map(m => m.id) || []

        if (brandIds.length > 0 || modelIds.length > 0) {
          let templateQuery = supabaseAdmin
            .from('car_templates')
            .select('id')

          if (brandIds.length > 0 && modelIds.length > 0) {
            templateQuery = templateQuery.or('brand_id.in.(' + brandIds.join(',') + '),model_id.in.(' + modelIds.join(',') + ')')
          } else if (brandIds.length > 0) {
            templateQuery = templateQuery.in('brand_id', brandIds)
          } else if (modelIds.length > 0) {
            templateQuery = templateQuery.in('model_id', modelIds)
          }

          const { data: templates } = await templateQuery
          const ids = templates?.map(t => t.id) || []

          if (ids.length > 0) {
            if (templateIds !== null) {
              templateIds = templateIds.filter(id => ids.includes(id))
            } else {
              templateIds = ids
            }
          } else if (templateIds !== null) {
            // Если уже был фильтр по template_id, но поиск ничего не дал - обнуляем
            templateIds = []
          }
          // Если templateIds === null и ids.length === 0, значит поиск по бренду/модели ничего не дал,
          // но мы не блокируем - поиск будет по описанию автомобиля
        }
      }
    }

    // Если после всех фильтров нет подходящих шаблонов, возвращаем пустой результат
    if (templateIds !== null && templateIds.length === 0) {
      return Response.json({
        data: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0
      })
    }

    // Запрос только доступных автомобилей (status='available')
    let query = supabaseAdmin
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
      .eq('status', 'available') // Только доступные автомобили

    // Применяем фильтр по template_id
    if (templateIds !== null && templateIds.length > 0) {
      query = query.in('template_id', templateIds)
    }

    // Поиск по описанию автомобиля
    // Если templateIds === null, значит не было фильтра по бренду/модели через шаблоны,
    // ищем по описанию. Если templateIds !== null, значит уже фильтруем по шаблонам,
    // поиск по описанию не нужен (или можно добавить как дополнительный фильтр через OR)
    if (filters.q && templateIds === null) {
      const val = (filters.q as string).trim()
      if (val) {
        query = query.ilike('description', '%' + val + '%')
      }
    }

    // Фильтр по цене
    if (filters.price_min) {
      query = query.gte('price_per_day', parseFloat(filters.price_min))
    }

    if (filters.price_max) {
      query = query.lte('price_per_day', parseFloat(filters.price_max))
    }

    // Сортировка
    if (sortBy === 'price') {
      query = query.order('price_per_day', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else {
      // По умолчанию - по дате создания (новые сначала)
      query = query.order('created_at', { ascending: false })
    }

    // Пагинация
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching public cars:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    })

  } catch (error) {
    console.error('Internal server error in /api/public/cars:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
