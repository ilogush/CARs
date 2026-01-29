
import { apiClient } from './client'
import { Client } from '@/types/clients'
import { ListParams, ListResponse } from '@/types/api'

export const clientsApi = {
    getAll: (params: ListParams = {}) => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
        if (params.filters) searchParams.set('filters', JSON.stringify(params.filters))
        if (params.admin_mode && params.company_id) {
            searchParams.set('admin_mode', 'true')
            searchParams.set('company_id', params.company_id.toString())
        }

        return apiClient.get<ListResponse<Client>>(`/api/clients?${searchParams.toString()}`)
    },

    search: (email: string) => {
        return apiClient.get<{ user: Client }>(`/api/clients/search?email=${encodeURIComponent(email)}`)
    },

    create: (data: any) => {
        // Assuming /api/clients creates a user
        return apiClient.post<Client>('/api/clients', data)
    }
}
