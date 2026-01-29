import { unstable_cache } from 'next/cache'
import { CACHE_TAGS, CacheTag } from './cache-tags'

/**
 * Обертка над unstable_cache для более удобного использования с типизацией и тегами
 */
export async function withCache<T>(
    fn: () => Promise<T>,
    keyParts: string[],
    options: {
        tags?: CacheTag[]
        revalidate?: number | false
    } = {}
) {
    return unstable_cache(
        async () => fn(),
        keyParts,
        {
            tags: options.tags,
            revalidate: options.revalidate !== undefined ? options.revalidate : 3600 // По умолчанию 1 час
        }
    )()
}
