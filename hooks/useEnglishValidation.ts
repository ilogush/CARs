'use client'

import { useCallback, useRef } from 'react'
import { useToast } from '@/lib/toast'
import { hasNonLatinChars, ENGLISH_ONLY_TOAST } from '@/lib/validation'

/**
 * Hook for validating English-only input with toast notification
 * Shows a warning toast when user types non-Latin characters
 * Debounces toast to avoid spamming
 */
export function useEnglishValidation() {
    const toast = useToast()
    const lastToastTimeRef = useRef<number>(0)
    const TOAST_DEBOUNCE_MS = 3000 // Show toast max every 3 seconds

    /**
     * Check input value and show toast if non-Latin characters detected
     * Returns true if non-Latin chars are present
     */
    const checkAndWarn = useCallback((value: string): boolean => {
        if (hasNonLatinChars(value)) {
            const now = Date.now()
            if (now - lastToastTimeRef.current > TOAST_DEBOUNCE_MS) {
                lastToastTimeRef.current = now
                toast.warning(ENGLISH_ONLY_TOAST)
            }
            return true
        }
        return false
    }, [toast])

    /**
     * Input change handler that validates English-only input
     * Use this as onChange handler for inputs
     */
    const handleInputChange = useCallback(
        (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            originalOnChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
        ) => {
            checkAndWarn(e.target.value)
            originalOnChange?.(e)
        },
        [checkAndWarn]
    )

    return {
        checkAndWarn,
        handleInputChange,
        hasNonLatinChars
    }
}
