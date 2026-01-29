import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/rbac'
import { z } from 'zod'
import { 
  parsePaginationParams,
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG, 
  PerformanceMonitor 
} from '@/lib/api/performance'

// Валидация схемы для создания/обновления шаблона авто
const carTemplateSchema = z.object({
    brand_id: z.number().int().positive('Brand ID must be a positive integer'),
    model_id: z.number().int().positive('Model ID must be a positive integer'),
    body_type_id: z.number().int().positive().optional(),
    car_class_id: z.number().int().positive().optional(),
    fuel_type_id: z.number().int().positive().optional(),
    door_count_id: z.number().int().positive().optional(),
    seat_count_id: z.number().int().positive().optional(),
    transmission_type_id: z.number().int().positive().optional(),
    engine_volume_id: z.number().int().positive().optional(),
    body_type: z.string().optional(), // Для обратной совместимости
    car_class: z.string().optional(), // Для обратной совместимости
    fuel_type: z.string().optional(), // Для обратной совместимости
    body_production_start_year: z.number().int().min(1900).max(new Date().getFullYear() + 1)
})

// GET - список шаблонов авто
export async function GET(request: NextRequest) {
    const perf = new PerformanceMonitor('GET /api/car-templates')
    
    try {
        const params = parsePaginationParams(request.nextUrl.searchParams)
        const pageSize = Math.min(params.pageSize, 100)

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return createErrorResponse(new Error('Unauthorized'), 401)
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let query = supabaseAdmin
            .from('car_templates')
            .select(`
        id, brand_id, model_id, body_type_id, car_class_id, fuel_type_id, 
        door_count_id, seat_count_id, transmission_type_id, engine_volume_id,
        body_production_start_year, created_at,
        car_brands (id, name),
        car_models (id, name),
        car_body_types (id, name),
        car_classes (id, name),
        car_fuel_types (id, name),
        car_door_counts (id, count),
        car_seat_counts (id, count),
        car_transmission_types (id, name),
        car_engine_volumes (id, volume)
      `, { count: 'estimated' })

        // Apply filters
        if (params.filters.q) {
            const searchValue = String(params.filters.q).trim()
            if (searchValue) {
                query = query.or(`car_models.name.ilike.%${searchValue}%,car_brands.name.ilike.%${searchValue}%`)
            }
        }
        
        if (params.filters.brand_id) {
            const brandId = typeof params.filters.brand_id === 'string' ? parseInt(params.filters.brand_id) : params.filters.brand_id
            if (!isNaN(brandId)) {
                query = query.eq('brand_id', brandId)
            }
        }
        
        if (params.filters.model_id) {
            const modelId = typeof params.filters.model_id === 'string' ? parseInt(params.filters.model_id) : params.filters.model_id
            if (!isNaN(modelId)) {
                query = query.eq('model_id', modelId)
            }
        }
        
        Object.entries(params.filters).forEach(([key, value]) => {
            if (key !== 'q' && key !== 'brand_id' && key !== 'model_id' && value !== null && value !== undefined && value !== '') {
                query = query.ilike(key, `%${value}%`)
            }
        })

        // Apply sorting
        const sortBy = params.sortBy || 'created_at'
        query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

        // Apply pagination
        const from = (params.page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query.range(from, to)

        if (error) {
            console.error('Supabase error fetching car templates:', error)
            return createErrorResponse(error, 500)
        }

        perf.end()

        return createCachedResponse(
            {
                data: data || [],
                totalCount: count || 0
            },
            CACHE_CONFIG.REFERENCE_DATA
        )

    } catch (error: any) {
        console.error('Internal server error in GET /api/car-templates:', error)
        return createErrorResponse(error, 500)
    }
}

// POST - создание шаблона авто
const POST = withAuth(
    async (request: NextRequest, context: any): Promise<NextResponse> => {
        try {
            const body = await request.json()

            // Валидация данных
            const validatedData = carTemplateSchema.parse(body)

            const supabase = await createClient()

            // Проверяем существование бренда
            const { data: brand } = await supabase
                .from('car_brands')
                .select('id')
                .eq('id', validatedData.brand_id)
                .single()

            if (!brand) {
                return NextResponse.json(
                    { error: 'Car brand not found' },
                    { status: 400 }
                )
            }

            // Проверяем существование модели
            const { data: model } = await supabase
                .from('car_models')
                .select('id, brand_id')
                .eq('id', validatedData.model_id)
                .single()

            if (!model) {
                return NextResponse.json(
                    { error: 'Car model not found' },
                    { status: 400 }
                )
            }

            // Проверяем что модель принадлежит указанному бренду
            if (model.brand_id !== validatedData.brand_id) {
                return NextResponse.json(
                    { error: 'Car model does not belong to the specified brand' },
                    { status: 400 }
                )
            }

            // Подготавливаем данные для создания
            const insertData: any = {
                brand_id: validatedData.brand_id,
                model_id: validatedData.model_id,
                body_production_start_year: validatedData.body_production_start_year
            }

            // Добавляем новые поля из справочников
            if (validatedData.body_type_id) insertData.body_type_id = validatedData.body_type_id
            if (validatedData.car_class_id) insertData.car_class_id = validatedData.car_class_id
            if (validatedData.fuel_type_id) insertData.fuel_type_id = validatedData.fuel_type_id
            if (validatedData.door_count_id) insertData.door_count_id = validatedData.door_count_id
            if (validatedData.seat_count_id) insertData.seat_count_id = validatedData.seat_count_id
            if (validatedData.transmission_type_id) insertData.transmission_type_id = validatedData.transmission_type_id
            if (validatedData.engine_volume_id) insertData.engine_volume_id = validatedData.engine_volume_id

            // Обратная совместимость со старыми полями
            if (validatedData.body_type) insertData.body_type = validatedData.body_type
            if (validatedData.car_class) insertData.car_class = validatedData.car_class
            if (validatedData.fuel_type) insertData.fuel_type = validatedData.fuel_type

            // Создаем шаблон авто
            const { data: template, error: templateError } = await supabase
                .from('car_templates')
                .insert(insertData)
                .select(`
          *,
          car_brands (
            id,
            name
          ),
          car_models (
            id,
            name
          )
        `)
                .single()

            if (templateError) {
                console.error('Error creating car template:', templateError)
                return NextResponse.json(
                    { error: templateError.message },
                    { status: 500 }
                )
            }

            // Получаем полный шаблон
            const { data: fullTemplate } = await supabase
                .from('car_templates')
                .select(`
          *,
          car_brands (
            id,
            name
          ),
          car_models (
            id,
            name
          )
        `)
                .eq('id', template.id)
                .single()

            // Логируем действие
            await (await import('@/lib/audit-middleware')).logAuditAction(request, {
                entity_type: 'car_template',
                entity_id: template.id.toString(),
                action: 'create',
                after_state: fullTemplate
            })

            return NextResponse.json({ data: fullTemplate }, { status: 201 })

        } catch (error) {
            console.error('Error in POST /api/car-templates:', error)

            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    { error: 'Validation failed', details: error.issues },
                    { status: 400 }
                )
            }

            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    { resource: 'car_templates', action: 'create', scope: 'system' }
)

export { POST }
