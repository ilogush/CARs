import { NextResponse } from 'next/server'

/**
 * API Response cache configuration
 */
export const CACHE_CONFIG = {
  // Static reference data - cache for 1 hour
  REFERENCE_DATA: {
    revalidate: 3600,
    cacheControl: 'public, s-maxage=3600, stale-while-revalidate=7200',
  },
  // Dynamic data - cache for 1 minute
  DYNAMIC_DATA: {
    revalidate: 60,
    cacheControl: 'public, s-maxage=60, stale-while-revalidate=120',
  },
  // User-specific data - cache for 30 seconds
  USER_DATA: {
    revalidate: 30,
    cacheControl: 'private, max-age=30, stale-while-revalidate=60',
  },
  // Real-time data - no cache
  REALTIME_DATA: {
    revalidate: 0,
    cacheControl: 'no-store, no-cache, must-revalidate',
  },
}

/**
 * Create optimized API response with cache headers
 */
export function createCachedResponse<T>(
  data: T,
  cacheConfig: (typeof CACHE_CONFIG)[keyof typeof CACHE_CONFIG] = CACHE_CONFIG.DYNAMIC_DATA
) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': cacheConfig.cacheControl,
      'CDN-Cache-Control': cacheConfig.cacheControl,
      'Vercel-CDN-Cache-Control': cacheConfig.cacheControl,
    },
  })
}

/**
 * Query optimization utilities
 */
export const QueryOptimization = {
  /**
   * Use estimated count for better performance
   * Use 'exact' only when precise count is critical
   */
  COUNT_MODE: {
    FAST: 'estimated' as const,
    ACCURATE: 'exact' as const,
  },

  /**
   * Default page sizes for different entity types
   */
  PAGE_SIZES: {
    SMALL: 10,    // For heavy queries with many joins
    MEDIUM: 20,   // Default for most lists
    LARGE: 50,    // For lightweight reference data
    XLARGE: 100,  // For dropdown/select options
  },

  /**
   * Select only needed fields to reduce payload size
   */
  MINIMAL_FIELDS: {
    user: 'id, name, surname, email, role',
    company: 'id, name, location_id',
    car: 'id, license_plate, status',
    location: 'id, name',
    contract: 'id, start_date, end_date, status, total_amount',
  },
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number

  constructor(private label: string) {
    this.startTime = Date.now()
  }

  log(checkpoint?: string) {
    const duration = Date.now() - this.startTime
    const message = checkpoint
      ? `${this.label} - ${checkpoint}: ${duration}ms`
      : `${this.label}: ${duration}ms`
    
    // Only log in development or if query is slow
    if (process.env.NODE_ENV === 'development' || duration > 500) {
      console.log(`⏱️  ${message}`)
    }
    
    return duration
  }

  end() {
    return this.log()
  }
}

/**
 * Parallel data fetching helper
 */
export async function fetchParallel<T extends Record<string, Promise<any>>>(
  promises: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(promises) as (keyof T)[]
  const values = await Promise.all(Object.values(promises))
  
  return keys.reduce((acc, key, index) => {
    acc[key] = values[index]
    return acc
  }, {} as any)
}

/**
 * Error response helper
 */
export function createErrorResponse(error: any, status: number = 500) {
  const message = error?.message || 'Internal server error'
  console.error('API Error:', error)
  
  return NextResponse.json(
    { error: message },
    { 
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

/**
 * Pagination helper
 */
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const sortBy = searchParams.get('sortBy') || undefined
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  
  let filters: Record<string, any> = {}
  try {
    const filtersParam = searchParams.get('filters')
    if (filtersParam) {
      filters = JSON.parse(filtersParam)
    }
  } catch (e) {
    console.warn('Invalid filters JSON:', e)
  }
  
  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  }
}
