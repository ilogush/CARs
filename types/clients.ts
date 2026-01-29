
import { User } from './database.types'

export interface Client extends Partial<User> {
    id: string
    // Additional profile fields if any
    passport_number?: string | null
}
