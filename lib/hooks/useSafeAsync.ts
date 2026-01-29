import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook for safe async operations with automatic cleanup
 * Prevents memory leaks and state updates on unmounted components
 */
export function useSafeAsync() {
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    abortControllerRef.current = new AbortController()

    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Safe fetch wrapper that automatically cancels on unmount
   */
  const safeFetch = useCallback(async <T = any>(
    url: string,
    options?: RequestInit
  ): Promise<T | null> => {
    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current?.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Only return data if component is still mounted
      return isMountedRef.current ? data : null
    } catch (error: any) {
      // Ignore abort errors (component unmounted)
      if (error.name === 'AbortError') {
        return null
      }
      throw error
    }
  }, [])

  /**
   * Safe state setter that only updates if component is mounted
   */
  const safeSetState = useCallback(<T>(
    setter: (value: T) => void,
    value: T
  ) => {
    if (isMountedRef.current) {
      setter(value)
    }
  }, [])

  /**
   * Check if component is still mounted
   */
  const isMounted = useCallback(() => {
    return isMountedRef.current
  }, [])

  return {
    safeFetch,
    safeSetState,
    isMounted,
    signal: abortControllerRef.current?.signal
  }
}
