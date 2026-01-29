import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standardized API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: any
  timestamp?: string
}

/**
 * Success response builder
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Error response builder with automatic error type detection
 */
export function apiError(
  error: any,
  status?: number
): NextResponse<ApiResponse> {
  // Determine status code
  let statusCode = status || 500
  let errorMessage = 'Internal server error'
  let details: any = undefined

  // Handle different error types
  if (error instanceof ZodError) {
    statusCode = 400
    errorMessage = 'Validation error'
    details = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  } else if (typeof error === 'string') {
    errorMessage = error
    if (error.toLowerCase().includes('unauthorized')) statusCode = 401
    else if (error.toLowerCase().includes('forbidden')) statusCode = 403
    else if (error.toLowerCase().includes('not found')) statusCode = 404
  } else if (error?.message) {
    errorMessage = error.message
    
    // Detect common error patterns
    if (errorMessage.toLowerCase().includes('unauthorized')) statusCode = 401
    else if (errorMessage.toLowerCase().includes('forbidden')) statusCode = 403
    else if (errorMessage.toLowerCase().includes('not found')) statusCode = 404
    else if (error.code === '23505') {
      statusCode = 409
      errorMessage = 'Resource already exists'
    } else if (error.code === '23503') {
      statusCode = 409
      errorMessage = 'Cannot delete resource that is in use'
    }
  }

  // Don't expose internal details in production
  const isProduction = process.env.NODE_ENV === 'production'
  
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      details: isProduction ? undefined : details,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  )
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandling<T = any>(
  handler: (request: Request, context?: any) => Promise<T>
) {
  return async (request: Request, context?: any) => {
    try {
      const result = await handler(request, context)
      
      // If result is already a Response, return it
      if (result instanceof Response) {
        return result
      }
      
      // Otherwise wrap in success response
      return apiSuccess(result)
    } catch (error) {
      console.error('[API Error]:', error)
      return apiError(error)
    }
  }
}

/**
 * Validation helper with automatic error response
 */
export function validateOrThrow<T>(schema: any, data: any): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      throw error // Will be caught by withErrorHandling
    }
    throw new Error('Validation failed')
  }
}
