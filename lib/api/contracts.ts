
import { apiClient } from './client'
import { Booking, BookingWithDetails, Contract, ContractWithDetails } from '@/types/contracts'
import { ListParams, ListResponse } from '@/types/api'

export const contractsApi = {
    getContracts: (params: ListParams = {}) => {
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

        return apiClient.get<ListResponse<ContractWithDetails>>(`/api/contracts?${searchParams.toString()}`)
    },

    getContract: (id: number, params: { admin_mode?: boolean, company_id?: number } = {}) => {
        const searchParams = new URLSearchParams()
        if (params.admin_mode && params.company_id) {
            searchParams.set('admin_mode', 'true')
            searchParams.set('company_id', params.company_id.toString())
        }
        return apiClient.get<ContractWithDetails>(`/api/contracts/${id}?${searchParams.toString()}`)
    },

    createContract: (data: any) => {
        return apiClient.post<Contract>('/api/contracts', data)
    },

    updateContract: (id: number, data: any) => {
        return apiClient.put<Contract>(`/api/contracts/${id}`, data)
    },

    getReferenceData: (params: { admin_mode?: boolean, company_id?: number } = {}) => {
        const searchParams = new URLSearchParams()
        if (params.admin_mode && params.company_id) {
            searchParams.set('admin_mode', 'true')
            searchParams.set('company_id', params.company_id.toString())
        }
        return apiClient.get<any>(`/api/references/contracts?${searchParams.toString()}`)
    }
}

export const bookingsApi = {
    getBookings: (params: ListParams = {}) => {
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

        return apiClient.get<ListResponse<Booking>>(`/api/bookings?${searchParams.toString()}`)
    },

    getBooking: (id: number, params: { admin_mode?: boolean, company_id?: number } = {}) => {
        const searchParams = new URLSearchParams()
        if (params.admin_mode && params.company_id) {
            searchParams.set('admin_mode', 'true')
            searchParams.set('company_id', params.company_id.toString())
        }
        return apiClient.get<BookingWithDetails>(`/api/bookings/${id}?${searchParams.toString()}`)
    }
}
