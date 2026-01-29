import { BaseRepository, ListParams, ListResponse } from './base'
import { CarBrand, CarModel, CarTemplate, CompanyCar } from '@/types/database.types'
import { withCache } from '@/lib/cache-utils'
import { CACHE_TAGS } from '@/lib/cache-tags'

export class CarsRepository extends BaseRepository {
    async listBrands(params: ListParams = {}): Promise<ListResponse<CarBrand>> {
        const fetchBrands = async () => {
            let query = this.supabase
                .from('car_brands')
                .select('*', { count: 'exact' })

            query = this.applySoftDelete(query)
            query = this.applySorting(query, params.sortBy || 'name', params.sortOrder)
            query = this.applyPagination(query, params.page, params.pageSize)

            const { data, count, error } = await query
            if (error) throw error
            return { data: data || [], totalCount: count || 0 }
        }

        // Cache for 1 hour by default
        return withCache(
            fetchBrands,
            ['brands', JSON.stringify(params)],
            { tags: [CACHE_TAGS.REFERENCE_DATA] }
        )
    }

    async listModels(params: ListParams = {}): Promise<ListResponse<CarModel>> {
        const fetchModels = async () => {
            let query = this.supabase
                .from('car_models')
                .select('*, car_brands(name)', { count: 'exact' })

            query = this.applySoftDelete(query)
            query = this.applySorting(query, params.sortBy || 'name', params.sortOrder)
            query = this.applyPagination(query, params.page, params.pageSize)

            const { data, count, error } = await query
            if (error) throw error
            return { data: data || [], totalCount: count || 0 }
        }

        return withCache(
            fetchModels,
            ['models', JSON.stringify(params)],
            { tags: [CACHE_TAGS.REFERENCE_DATA] }
        )
    }

    async listTemplates(params: ListParams = {}): Promise<ListResponse<CarTemplate>> {
        let query = this.supabase
            .from('car_templates')
            .select(`
        *,
        car_brands(name),
        car_models(name),
        car_body_types(name),
        car_classes(name),
        car_fuel_types(name),
        car_door_counts(count),
        car_seat_counts(count),
        car_transmission_types(name),
        car_engine_volumes(volume)
      `, { count: 'exact' })

        query = this.applySoftDelete(query)
        query = this.applySorting(query, params.sortBy || 'created_at', params.sortOrder || 'desc')
        query = this.applyPagination(query, params.page, params.pageSize)

        const { data, count, error } = await query

        if (error) throw error

        return {
            data: data || [],
            totalCount: count || 0
        }
    }

    async listCompanyCars(
        params: ListParams & { companyId?: number } = {}
    ): Promise<ListResponse<CompanyCar>> {
        let query = this.supabase
            .from('company_cars')
            .select(`
        *,
        car_templates(
          *,
          car_brands(name),
          car_models(name)
        ),
        car_colors(name)
      `, { count: 'exact' })

        if (params.companyId) {
            query = query.eq('company_id', params.companyId)
        }

        query = this.applySoftDelete(query)
        query = this.applySorting(query, params.sortBy || 'created_at', params.sortOrder || 'desc')
        query = this.applyPagination(query, params.page, params.pageSize)

        const { data, count, error } = await query

        if (error) throw error

        return {
            data: data || [],
            totalCount: count || 0
        }
    }

    async getReferenceData() {
        return withCache(
            async () => {
                const [
                    { data: bodyTypes },
                    { data: carClasses },
                    { data: fuelTypes },
                    { data: doorCounts },
                    { data: seatCounts },
                    { data: transmissionTypes },
                    { data: engineVolumes }
                ] = await Promise.all([
                    this.supabase.from('car_body_types').select('id, name').order('name'),
                    this.supabase.from('car_classes').select('id, name').order('name'),
                    this.supabase.from('car_fuel_types').select('id, name').order('name'),
                    this.supabase.from('car_door_counts').select('id, count').order('count'),
                    this.supabase.from('car_seat_counts').select('id, count').order('count'),
                    this.supabase.from('car_transmission_types').select('id, name').order('name'),
                    this.supabase.from('car_engine_volumes').select('id, volume').order('volume')
                ])

                return {
                    bodyTypes: bodyTypes || [],
                    carClasses: carClasses || [],
                    fuelTypes: fuelTypes || [],
                    doorCounts: doorCounts || [],
                    seatCounts: seatCounts || [],
                    transmissionTypes: transmissionTypes || [],
                    engineVolumes: engineVolumes || []
                }
            },
            ['car-reference-data'],
            { tags: [CACHE_TAGS.REFERENCE_DATA] }
        )
    }
}

