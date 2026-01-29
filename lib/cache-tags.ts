/**
 * Теги для управления инвалидацией кеша через revalidateTag
 */
export const CACHE_TAGS = {
    REFERENCE_DATA: 'reference-data',
    LOCATIONS: 'locations',
    DISTRICTS: 'districts',
    DASHBOARD_STATS: 'dashboard-stats',
    COMPANY_STATS: 'company-stats',
} as const

export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS]
