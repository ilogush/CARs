import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
    it('combines class names', () => {
        expect(cn('c-red', 'c-bold')).toBe('c-red c-bold')
    })

    it('handles conditional classes', () => {
        expect(cn('c-red', false && 'c-hidden', 'c-bold')).toBe('c-red c-bold')
    })

    it('merges tailwind classes properly', () => {
        // tailwind-merge should resolve conflict: last wins
        expect(cn('p-4', 'p-2')).toBe('p-2')
    })
})
