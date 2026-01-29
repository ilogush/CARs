
import { apiClient } from './client'

export interface Location {
    id: number
    name: string
    created_at?: string
    updated_at?: string
}

export const locationsApi = {
    getAll: () => {
        return apiClient.get<{ data: Location[] }>('/api/locations')
    }
}
