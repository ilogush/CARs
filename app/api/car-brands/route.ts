import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { withAuth, AuthContext } from '@/lib/rbac'
import { z } from 'zod'
import { BaseApiHandler } from '@/lib/api/base-api-handler'
import { 
  parsePaginationParams, 
  createCachedResponse, 
  createErrorResponse,
  CACHE_CONFIG,
  PerformanceMonitor
} from '@/lib/api/performance'

// Валидация схемы для создания/обновления бренда
const brandSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .refine((val) => /^[a-zA-Z0-9\s\-\._]+$/.test(val), 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores')
})

// GET - список брендов (оптимизированный)
async function GET(request: NextRequest) {
  const perf = new PerformanceMonitor('GET /api/car-brands')
  try {
    const params = parsePaginationParams(request.nextUrl.searchParams)
    const pageSize = Math.min(params.pageSize, 100)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(new Error('Unauthorized'), 401)
    }

    // Используем BaseApiHandler для стандартизированной обработки
    const handler = new BaseApiHandler()
    
    let query = (handler as any).supabaseAdmin
      .from('car_brands')
      .select('id, name, created_at', { count: 'estimated' })
      .is('deleted_at', null)

    // Apply filters
    if (params.filters.q) {
      query = query.ilike('name', `%${params.filters.q}%`)
    }
    
    Object.entries(params.filters).forEach(([key, value]) => {
      if (key !== 'q' && value !== null && value !== undefined) {
        query = query.ilike(key, `%${value}%`)
      }
    })

    // Apply sorting
    const sortBy = params.sortBy || 'name'
    query = query.order(sortBy, { ascending: params.sortOrder === 'asc' })

    // Apply pagination
    const from = (params.page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      const { formatErrorMessage } = await import('@/lib/error-handler')
      return createErrorResponse(new Error(formatErrorMessage(error)), 500)
    }

    perf.end()

    return createCachedResponse(
      {
        data: data || [],
        totalCount: count || 0
      },
      CACHE_CONFIG.REFERENCE_DATA
    )

  } catch (error) {
    const { formatErrorMessage } = await import('@/lib/error-handler')
    return createErrorResponse(new Error(formatErrorMessage(error)), 500)
  }
}

// POST - создание бренда
const POST = withAuth(
  async (request: NextRequest, _context: AuthContext & { params?: Promise<{ [key: string]: string }> }): Promise<NextResponse> => {
    try {
      const body = await request.json()

      // Валидация данных
      const validatedData = brandSchema.parse(body)

      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return createErrorResponse(new Error('Unauthorized'), 401)
      }

      // Создаем бренд через RPC (атомарно с аудитом и проверкой уникальности)
      const { data, error } = await supabase.rpc('create_car_brand', {
        p_name: validatedData.name,
        p_user_id: user.id,
        p_audit_metadata: {
          ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      })

      if (error) {
        const { formatErrorMessage } = await import('@/lib/error-handler')
        return createErrorResponse(
          new Error(formatErrorMessage(error)),
          error.code === '23505' ? 400 : 500
        )
      }

      return NextResponse.json({ data }, { status: 201 })

    } catch (error) {
      const { formatErrorMessage } = await import('@/lib/error-handler')

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      return createErrorResponse(new Error(formatErrorMessage(error)), 500)
    }
  },
  { resource: 'car_brands', action: 'create', scope: 'system' }
)

export { GET, POST }
