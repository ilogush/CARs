/**
 * Type-safe error handling utilities
 */

/**
 * Standard error object from API/Database
 */
export interface ApiError {
  message: string
  code?: string
  details?: unknown
  status?: number
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  )
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * PostgreSQL error with code
 */
export interface PostgresError extends Error {
  code: string
  detail?: string
  hint?: string
  table?: string
  constraint?: string
}

/**
 * Type guard for PostgreSQL errors
 */
export function isPostgresError(error: unknown): error is PostgresError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as PostgresError).code === 'string'
  )
}
