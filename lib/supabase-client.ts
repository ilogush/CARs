import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export function createSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.')
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

export function createSupabaseClientSafe() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        return null
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey)
}
