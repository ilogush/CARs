/**
 * Единые стили для всего проекта - минималистичный, строгий, легкий стиль
 */

// Border radius - единый для всего проекта
export const borderRadius = 'rounded-md'

// Shadows - минимальные или без теней
export const shadowNone = ''
export const shadowMinimal = 'border border-gray-200'

// Spacing - единые отступы
export const spacing = {
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
}

// Card styles - минималистичные карточки
export const cardBase = 'bg-white border border-gray-200'
export const cardPadding = spacing.md

// Typography - единые размеры и веса
export const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl'
}

export const fontWeights = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
}

// Colors - только серые оттенки
export const colors = {
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
    light: 'text-gray-500'
  },
  bg: {
    white: 'bg-white',
    gray50: 'bg-gray-50',
    gray100: 'bg-gray-200',
    gray200: 'bg-gray-200'
  },
  border: {
    default: 'border-gray-200',
    light: 'border-gray-100',
    dark: 'border-gray-300'
  }
}
