/**
 * Simple in-memory rate limiter
 * For production, consider using Redis with @upstash/ratelimit
 */

interface RateLimitStore {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitStore>()

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP address or user ID)
 * @param limit - Maximum number of requests
 * @param window - Time window in milliseconds
 * @returns true if rate limit exceeded
 */
export function isRateLimited(
  identifier: string,
  limit: number = 5,
  window: number = 60000 // 1 minute
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  
  let record = store.get(key)
  
  // Clean up expired records
  if (record && now > record.resetTime) {
    store.delete(key)
    record = undefined
  }
  
  if (!record) {
    // First request
    store.set(key, {
      count: 1,
      resetTime: now + window
    })
    return {
      limited: false,
      remaining: limit - 1,
      resetTime: now + window
    }
  }
  
  // Check if limit exceeded
  if (record.count >= limit) {
    return {
      limited: true,
      remaining: 0,
      resetTime: record.resetTime
    }
  }
  
  // Increment counter
  record.count++
  store.set(key, record)
  
  return {
    limited: false,
    remaining: limit - record.count,
    resetTime: record.resetTime
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
}

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key)
    }
  }
}, 600000)
