import { cache } from 'react'
import { createClient } from './supabase/server'
import type { Location } from '@/types/database.types'

/**
 * Кэшированные функции для часто используемых запросов
 * Использует React.cache() для дедупликации запросов в рамках одного рендера
 */

// Тип для локаций с минимальными полями (для списков)
type LocationListItem = Pick<Location, 'id' | 'name'>

// Кэшированное получение локаций (полный тип для совместимости)
export const getCachedLocations = cache(async (): Promise<Location[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, created_at, updated_at')
    .order('name')

  if (error) {
    console.error('Error fetching locations:', error)
    return []
  }

  return (data || []) as Location[]
})

// Кэшированное получение пользователя (уже есть в auth.ts, но можно добавить дополнительное кэширование)
export const getCachedUser = cache(async () => {
  const { getCurrentUser } = await import('./auth')
  return getCurrentUser()
})

