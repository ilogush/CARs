import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface ListParams {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
}

export interface ListResponse<T> {
    data: T[]
    totalCount: number
}

export abstract class BaseRepository {
    constructor(protected readonly supabase: SupabaseClient<Database>) { }

    protected applyPagination<T>(
        query: any,
        page: number = 1,
        pageSize: number = 20
    ) {
        // Enforce hard limit (CursorRules compliance)
        const limit = Math.min(Math.max(1, pageSize), 100)
        const from = (page - 1) * limit
        const to = from + limit - 1
        return query.range(from, to)
    }

    protected applySorting(
        query: any,
        sortBy?: string,
        sortOrder: 'asc' | 'desc' = 'asc'
    ) {
        if (sortBy) {
            return query.order(sortBy, { ascending: sortOrder === 'asc' })
        }
        return query
    }

    protected applySoftDelete(query: any) {
        return query
    }
}
