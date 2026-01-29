import { createClient } from '@/lib/supabase/server'
import { CarsRepository } from './cars'
import { ContractsRepository } from './contracts'
import { LocationsRepository } from './locations'

export async function getRepositories() {
    const supabase = await createClient()

    return {
        cars: new CarsRepository(supabase),
        contracts: new ContractsRepository(supabase),
        locations: new LocationsRepository(supabase)
    }
}
