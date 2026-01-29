
import { Database } from './database.types'

export type Contract = Database['public']['Tables']['contracts']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']

export interface ContractWithDetails extends Contract {
    client?: {
        id: string
        name: string | null
        surname: string | null
        email: string
        phone: string | null
    }
    company_cars?: {
        id: number
        license_plate: string
        car_templates?: {
            car_brands?: { name: string }
            car_models?: { name: string }
        }
    }
}

export interface BookingWithDetails extends Booking {
    client?: {
        id: string
        name: string | null
        surname: string | null
        email: string
        phone: string | null
    }
    users?: {
        id: string
        name: string | null
        surname: string | null
        email: string
        phone: string | null
    }
    company_cars?: {
        id: number
        license_plate: string
        car_templates?: {
            car_brands?: { name: string }
            car_models?: { name: string }
        }
    }
}
