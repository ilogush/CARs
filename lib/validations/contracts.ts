import { z } from 'zod'
import { dateStringSchema } from './common'

/**
 * Validation schema for Contract Creation/Update.
 * Used by:
 * - /app/api/contracts/route.ts (Server-side validation)
 * - /components/contracts/ContractForm.tsx (Client-side validation)
 */
export const contractSchema = z.object({
    booking_id: z.coerce.number().optional().nullable(),
    client_id: z.string().uuid({ message: "Invalid Client ID format" }),
    company_car_id: z.coerce.number().int().positive("Car selection is required"),
    manager_id: z.string().uuid().optional().nullable(),

    start_date: dateStringSchema.transform(str => new Date(str).toISOString()),
    end_date: dateStringSchema.transform(str => new Date(str).toISOString()),

    total_amount: z.coerce.number().nonnegative("Total amount must be non-negative"),
    deposit_amount: z.union([z.number(), z.string(), z.null(), z.undefined()])
        .transform(val => {
            if (val === '' || val === null || val === undefined) return 0
            const parsed = parseFloat(val.toString())
            return isNaN(parsed) ? 0 : parsed
        }),

    notes: z.string().optional().nullable().transform(val => val?.trim() || null),
    photos: z.array(z.string()).optional().default([]),

    // Optimistic Locking field (optional for now to support incremental adopt)
    car_version: z.string().optional().nullable()
})

// Infer TypeScript type directly from the schema
export type CreateContractDTO = z.infer<typeof contractSchema>
