
import { apiClient } from './client'
import { User } from '@/types/database.types'
import { ListParams, ListResponse } from '@/types/api'

export const usersApi = {
    getUsers: (params: ListParams = {}) => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
        if (params.filters) searchParams.set('filters', JSON.stringify(params.filters))
        if (params.admin_mode && params.company_id) {
            searchParams.set('admin_mode', 'true')
            searchParams.set('company_id', params.company_id.toString())
        }

        return apiClient.get<ListResponse<User>>(`/api/users?${searchParams.toString()}`)
    },

    getMe: () => {
        return apiClient.get<User>('/api/users/me')
    }
}
