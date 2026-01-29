import { z } from 'zod'
import { nameSchema } from './common'

const fourDigitYear = () => {
  const maxYear = new Date().getFullYear() + 1

  return z.preprocess(
    (val) => {
      if (typeof val === 'number') return String(val)
      if (typeof val === 'string') return val.trim()
      return ''
    },
    z
      .string()
      .regex(/^\d{4}$/, 'Введите год в формате YYYY')
      .transform((v) => Number(v))
      .refine((v) => v >= 2015, 'Год не может быть раньше 2015')
      .refine((v) => v <= maxYear, 'Год не может быть позже следующего')
  )
}

export const carSchema = z.object({
  brand: nameSchema,
  model: nameSchema,
  year: fourDigitYear(),
  doors: z.coerce.number().min(2, 'Must have at least 2 doors').max(5, 'Max 5 doors').default(4),
  body_type: nameSchema,
  engine_volume: z.coerce.number().min(0.6, 'Engine volume is too small').max(10, 'Engine volume is too large'),
  color: nameSchema,
  price_per_day: z.coerce.number().min(0, 'Price must be positive'),
  seats: z.coerce.number().min(1, 'Seats must be at least 1'),
  transmission: z.enum(['Automatic', 'Manual']),
  status: z.enum(['available', 'maintenance', 'rented', 'booked']),
  description: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : ''),
    z.string().default('')
  ),
  company_id: z.coerce.number().min(1, 'Company is required'),
  location_ids: z.array(z.number()).min(1, 'Select at least one location'),
  photos: z.array(z.string()).optional(), // Array of URLs
})

export type CarFormData = z.input<typeof carSchema>
