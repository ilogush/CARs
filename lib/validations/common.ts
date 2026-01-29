import { z } from 'zod'

/**
 * Common Zod schemas with built-in data scrubbing and normalization.
 */

// Email: trim and lowercase
export const emailSchema = z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().email('Invalid email address')
)

// Phone: remove all non-digit characters, ensure minimum length
export const phoneSchema = z.preprocess(
    (val) => (typeof val === 'string' ? val.replace(/\D/g, '') : val),
    z.string().min(10, 'Phone number must be at least 10 digits')
)

// Name: trim and ensure it's not empty
export const nameSchema = z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'Name is required').max(100)
)

// Pagination
export const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
})

// UUID
export const uuidSchema = z.string().uuid('Invalid UUID format')

// ID (BigInt/Number)
export const idSchema = z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])

// Date strings
export const dateStringSchema = z.string().datetime({ message: 'Invalid ISO date string' })
