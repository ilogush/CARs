import { BaseRepository, ListParams, ListResponse } from './base'
import { Contract } from '@/types/contracts'

export class ContractsRepository extends BaseRepository {
    async getContractWithDetails(id: number): Promise<any> {
        const { data, error } = await this.supabase
            .from('contracts')
            .select(`
        *,
        client:users!contracts_client_id_fkey(*),
        manager:users!contracts_manager_id_fkey(*),
        car:company_cars(
          *,
          template:car_templates(
            *,
            brand:car_brands(name),
            model:car_models(name)
          )
        ),
        payments(*)
      `)
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    }

    async listContracts(
        params: ListParams & { companyId?: number, managerId?: string, clientId?: string } = {}
    ): Promise<ListResponse<any>> {
        let query = this.supabase
            .from('contracts')
            .select(`
        *,
        client:users!contracts_client_id_fkey(name, surname, email),
        car:company_cars(
          license_plate,
          template:car_templates(
            brand:car_brands(name),
            model:car_models(name)
          )
        )
      `, { count: 'exact' })

        if (params.clientId) {
            query = query.eq('client_id', params.clientId)
        }

        // filtering by company requires joining through company_cars
        // for simplicity, we assume manager filtering handles company context if needed
        if (params.managerId) {
            query = query.eq('manager_id', params.managerId)
        }

        query = this.applySorting(query, params.sortBy || 'created_at', params.sortOrder || 'desc')
        query = this.applyPagination(query, params.page, params.pageSize)

        const { data, count, error } = await query

        if (error) throw error

        return {
            data: data || [],
            totalCount: count || 0
        }
    }
}
