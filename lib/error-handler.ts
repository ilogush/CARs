import { ZodError } from 'zod'

export interface AppError {
    message: string
    code?: string
    details?: any
}

/**
 * Unified error handler that transforms various error types (Postgres, Zod, etc.)
 * into a user-friendly string message.
 */
export function formatErrorMessage(error: any): string {
    if (!error) return 'An unknown error occurred'

    // 1. Zod Validation Errors
    if (error instanceof ZodError) {
        const issues = error.issues.map(issue => {
            const path = issue.path.join('.')
            return path ? `${path}: ${issue.message}` : issue.message
        })
        return issues.join('; ') || 'Validation error'
    }

    // 2. Extract message from object if present
    const message = typeof error === 'string' ? error : error.message || String(error)
    const code = error.code // Postgres Error Code

    // 3. PostgreSQL Error Codes (common ones)
    // 23505: Unique violation
    if (code === '23505' || message.includes('unique constraint') || message.includes('already exists')) {
        if (message.includes('users_email_key') || message.includes('email')) {
            return 'A user with this email already exists.'
        }
        if (message.includes('license_plate')) {
            return 'A car with this license plate already exists.'
        }
        if (message.includes('vin')) {
            return 'A car with this VIN number already exists.'
        }
        return 'This record already exists.'
    }

    // 23503: Foreign key violation
    if (code === '23503' || message.includes('violates foreign key constraint')) {
        return 'This action cannot be completed because it depends on other data (e.g. used in a contract).'
    }

    // 23502: Not null violation
    if (code === '23502') {
        return 'Required field is missing. Please check all mandatory fields.'
    }

    // 23514: Check constraint violation
    if (code === '23514') {
        return 'The data provided violates system rules (e.g. invalid date range or negative price).'
    }

    // 42P01: Undefined table (should not happen in prod)
    if (code === '42P01') {
        return 'System error: Database configuration issue.'
    }

    // 4. Supabase / RLS / Auth Errors
    if (message.includes('row-level security') || message.includes('permission denied') || message.includes('Forbidden')) {
        return 'You do not have permission to perform this action.'
    }

    if (message.includes('Unauthorized') || message.includes('Invalid login credentials')) {
        return 'Authentication failed. Please check your credentials.'
    }

    // 5. Generic Fallback
    if (message.includes('JSON') || message.includes('syntax') || message.includes('undefined')) {
        return 'Something went wrong on our end. Please try again later.'
    }

    return message
}
