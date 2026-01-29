import { BaseRepository, ListParams, ListResponse } from './base'
import { Location } from '@/types/database.types'
import { withCache } from '@/lib/cache-utils'
import { CACHE_TAGS } from '@/lib/cache-tags'

export class LocationsRepository extends BaseRepository {
    async listLocations(params: ListParams = {}): Promise<ListResponse<Location>> {
        const fetchLocations = async () => {
            let query = this.supabase
                .from('locations')
                .select('*', { count: 'exact' })

            query = this.applySoftDelete(query)
            query = this.applySorting(query, params.sortBy || 'name', params.sortOrder)
            query = this.applyPagination(query, params.page, params.pageSize)

            const { data, count, error } = await query
            if (error) throw error
            return { data: data || [], totalCount: count || 0 }
        }

        return withCache(
            fetchLocations,
            ['locations', JSON.stringify(params)],
            { tags: [CACHE_TAGS.LOCATIONS] }
        )
    }

    async listDistricts(locationId: number) {
        const fetchDistricts = async () => {
            const { data, error } = await this.supabase
                .from('districts')
                .select('*')
                .eq('location_id', locationId)
                .order('name')

            if (error) throw error
            return data || []
        }

        return withCache(
            fetchDistricts,
            ['districts', locationId.toString()],
            { tags: [CACHE_TAGS.DISTRICTS] }
        )
    }
}

