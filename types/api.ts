
export interface ListParams {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
    admin_mode?: boolean
    company_id?: number
}

export interface ListResponse<T> {
    data: T[]
    totalCount: number
}

export interface ApiResponse<T> {
    data?: T
    error?: string
    details?: any
}
