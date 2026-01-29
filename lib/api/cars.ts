import { apiClient } from './client'
import { CarBrand, CarModel, CarReferenceData, CarTemplate } from '@/types/cars'

interface ListParams {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
}

interface ListResponse<T> {
    data: T[]
    totalCount: number
}

export const carsApi = {
    getBrands: (params: ListParams = {}) => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
        if (params.sortBy) {
            searchParams.set('sortBy', params.sortBy)
            searchParams.set('sortOrder', params.sortOrder || 'asc')
        }
        if (params.filters) searchParams.set('filters', JSON.stringify(params.filters))

        return apiClient.get<ListResponse<CarBrand>>(`/api/car-brands?${searchParams.toString()}`)
    },

    createBrand: (data: Partial<CarBrand>) => {
        return apiClient.post<{ data: CarBrand }>('/api/car-brands', data)
    },

    updateBrand: (id: number, data: Partial<CarBrand>) => {
        return apiClient.put<{ data: CarBrand }>(`/api/car-brands/${id}`, data)
    },

    deleteBrand: (id: number) => {
        return apiClient.delete(`/api/car-brands/${id}`)
    },

    getModels: (params: ListParams = {}) => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
        if (params.sortBy) {
            searchParams.set('sortBy', params.sortBy)
            searchParams.set('sortOrder', params.sortOrder || 'asc')
        }
        if (params.filters) searchParams.set('filters', JSON.stringify(params.filters))

        return apiClient.get<ListResponse<CarModel>>(`/api/car-models?${searchParams.toString()}`)
    },

    createModel: (data: Partial<CarModel>) => {
        return apiClient.post<{ data: CarModel }>('/api/car-models', data)
    },

    updateModel: (id: number, data: Partial<CarModel>) => {
        return apiClient.put<{ data: CarModel }>(`/api/car-models/${id}`, data)
    },

    deleteModel: (id: number) => {
        return apiClient.delete(`/api/car-models/${id}`)
    },

    getReferenceData: () => {
        return apiClient.get<CarReferenceData>('/api/references/cars')
    },

    getTemplates: (params: ListParams = {}) => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
        if (params.sortBy) {
            searchParams.set('sortBy', params.sortBy)
            searchParams.set('sortOrder', params.sortOrder || 'asc')
        }
        if (params.filters) searchParams.set('filters', JSON.stringify(params.filters))

        return apiClient.get<ListResponse<CarTemplate>>(`/api/car-templates?${searchParams.toString()}`)
    },

    createTemplate: (data: any) => {
        return apiClient.post<{ data: CarTemplate }>('/api/car-templates', data)
    },

    updateTemplate: (id: number, data: any) => {
        return apiClient.put<{ data: CarTemplate }>(`/api/car-templates/${id}`, data)
    },

    deleteTemplate: (id: number) => {
        return apiClient.delete(`/api/car-templates/${id}`)
    },

    getCompanyCars: (params: ListParams & { admin_mode?: boolean, company_id?: number } = {}) => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
        if (params.sortBy) {
            searchParams.set('sortBy', params.sortBy)
            searchParams.set('sortOrder', params.sortOrder || 'asc')
        }
        if (params.filters) searchParams.set('filters', JSON.stringify(params.filters))

        if (params.admin_mode && params.company_id) {
            searchParams.set('admin_mode', 'true')
            searchParams.set('company_id', params.company_id.toString())
        }

        return apiClient.get<ListResponse<any>>(`/api/company-cars?${searchParams.toString()}`)
    },

    deleteCompanyCar: (id: number, params: { admin_mode?: boolean, company_id?: number } = {}) => {
        const searchParams = new URLSearchParams()
        if (params.admin_mode && params.company_id) {
            searchParams.set('admin_mode', 'true')
            searchParams.set('company_id', params.company_id.toString())
        }
        const queryString = searchParams.toString() ? `?${searchParams.toString()}` : ''
        return apiClient.delete(`/api/company-cars/${id}${queryString}`)
    }
}
