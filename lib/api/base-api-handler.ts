import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { 
  createCachedResponse, 
  createErrorResponse, 
  parsePaginationParams,
  CACHE_CONFIG,
  QueryOptimization,
  PerformanceMonitor
} from '@/lib/api/performance'
import { formatErrorMessage } from '@/lib/error-handler'

export interface ListQueryOptions {
  table: string
  selectFields?: string
  countMode?: 'exact' | 'estimated' | 'planned'
  defaultSortBy?: string
  defaultSortOrder?: 'asc' | 'desc'
  softDelete?: boolean
  applyCompanyFilter?: boolean
  additionalFilters?: (query: any, filters: Record<string, any>) => any
}

export interface ApiHandlerContext {
  user: any
  scope?: any
  supabase: SupabaseClient<Database>
  supabaseAdmin: SupabaseClient<Database>
}

/**
 * Базовый класс для стандартизированной обработки API запросов
 * Обеспечивает единообразную логику работы со списками, пагинацией, фильтрацией
 */
export class BaseApiHandler {
  protected supabaseAdmin: SupabaseClient<Database>

  constructor() {
    this.supabaseAdmin = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Стандартный GET обработчик для списков с пагинацией
   */
  async handleList(
    request: NextRequest,
    options: ListQueryOptions
  ): Promise<NextResponse> {
    const perf = new PerformanceMonitor(`GET ${options.table}`)
    
    try {
      // Парсинг параметров запроса
      const params = parsePaginationParams(request.nextUrl.searchParams)
      
      // Ограничение pageSize согласно CursorRules
      const safePageSize = Math.min(params.pageSize, 100)
      
      // Построение запроса
      let query = this.supabaseAdmin
        .from(options.table)
        .select(
          options.selectFields || '*',
          { count: options.countMode || 'estimated' }
        )
      
      // Применение soft delete фильтра
      if (options.softDelete !== false) {
        query = query.is('deleted_at', null)
      }
      
      // Применение фильтров
      if (options.additionalFilters) {
        query = options.additionalFilters(query, params.filters)
      } else {
        query = this.applyStandardFilters(query, params.filters)
      }
      
      // Применение сортировки
      const sortBy = params.sortBy || options.defaultSortBy || 'created_at'
      const sortOrder = params.sortOrder || options.defaultSortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      
      // Применение пагинации
      const from = (params.page - 1) * safePageSize
      const to = from + safePageSize - 1
      query = query.range(from, to)
      
      // Выполнение запроса
      const { data, count, error } = await query
      
      if (error) {
        console.error(`Supabase error in ${options.table}:`, error)
        return createErrorResponse(error, 500)
      }
      
      perf.end()
      
      // Возврат с кешированием
      return createCachedResponse(
        {
          data: data || [],
          totalCount: count || 0
        },
        CACHE_CONFIG.DYNAMIC_DATA
      )
      
    } catch (error: any) {
      console.error(`Error in handleList for ${options.table}:`, error)
      return createErrorResponse(error, 500)
    }
  }

  /**
   * Стандартная обработка фильтров для поиска
   */
  protected applyStandardFilters(
    query: any,
    filters: Record<string, any>
  ): any {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'q') {
          // Общий поиск - переопределяется в наследниках
        } else if (typeof value === 'string') {
          query = query.ilike(key, `%${value}%`)
        } else {
          query = query.eq(key, value)
        }
      }
    })
    return query
  }

  /**
   * Стандартный обработчик создания записи (POST)
   */
  async handleCreate(
    request: NextRequest,
    table: string,
    validateFn?: (data: any) => Promise<any>
  ): Promise<NextResponse> {
    try {
      const body = await request.json()
      
      // Валидация данных если предоставлена
      let validatedData = body
      if (validateFn) {
        validatedData = await validateFn(body)
      }
      
      // Создание записи
      const { data, error } = await this.supabaseAdmin
        .from(table)
        .insert(validatedData)
        .select()
        .single()
      
      if (error) {
        console.error(`Error creating ${table}:`, error)
        return createErrorResponse(error, error.code === '23505' ? 400 : 500)
      }
      
      return NextResponse.json(data, { status: 201 })
      
    } catch (error: any) {
      console.error(`Error in handleCreate for ${table}:`, error)
      return createErrorResponse(error, 500)
    }
  }

  /**
   * Стандартный обработчик обновления записи (PATCH)
   */
  async handleUpdate(
    request: NextRequest,
    table: string,
    id: number,
    validateFn?: (data: any) => Promise<any>
  ): Promise<NextResponse> {
    try {
      const body = await request.json()
      
      // Валидация данных если предоставлена
      let validatedData = body
      if (validateFn) {
        validatedData = await validateFn(body)
      }
      
      // Обновление записи
      const { data, error } = await (this.supabaseAdmin as any)
        .from(table)
        .update(validatedData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error(`Error updating ${table}:`, error)
        return createErrorResponse(error, 500)
      }
      
      if (!data) {
        return createErrorResponse(new Error('Not found'), 404)
      }
      
      return NextResponse.json(data)
      
    } catch (error: any) {
      console.error(`Error in handleUpdate for ${table}:`, error)
      return createErrorResponse(error, 500)
    }
  }

  /**
   * Стандартный обработчик удаления записи (DELETE)
   */
  async handleDelete(
    request: NextRequest,
    table: string,
    id: number,
    softDelete: boolean = true
  ): Promise<NextResponse> {
    try {
      if (softDelete) {
        // Мягкое удаление
        const { error } = await (this.supabaseAdmin as any)
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
        
        if (error) {
          console.error(`Error soft deleting ${table}:`, error)
          return createErrorResponse(error, 500)
        }
      } else {
        // Жесткое удаление
        const { error } = await (this.supabaseAdmin as any)
          .from(table)
          .delete()
          .eq('id', id)
        
        if (error) {
          console.error(`Error deleting ${table}:`, error)
          return createErrorResponse(error, 500)
        }
      }
      
      return NextResponse.json({ success: true })
      
    } catch (error: any) {
      console.error(`Error in handleDelete for ${table}:`, error)
      return createErrorResponse(error, 500)
    }
  }

  /**
   * Получение записи по ID
   */
  async handleGetById(
    request: NextRequest,
    table: string,
    id: number,
    selectFields?: string
  ): Promise<NextResponse> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from(table)
        .select(selectFields || '*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error(`Error fetching ${table} by id:`, error)
        return createErrorResponse(error, 500)
      }
      
      if (!data) {
        return createErrorResponse(new Error('Not found'), 404)
      }
      
      return createCachedResponse(data, CACHE_CONFIG.USER_DATA)
      
    } catch (error: any) {
      console.error(`Error in handleGetById for ${table}:`, error)
      return createErrorResponse(error, 500)
    }
  }

  /**
   * Утилита для парсинга ID из URL
   */
  protected parseIdFromUrl(url: string): number {
    const segments = url.split('/')
    const id = parseInt(segments[segments.length - 1])
    if (isNaN(id)) {
      throw new Error('Invalid ID format')
    }
    return id
  }
}
