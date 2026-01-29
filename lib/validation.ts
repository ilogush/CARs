/**
 * Единый модуль валидации для всего приложения
 * Используется в формах регистрации, логина и других местах
 */

// Validation to Latin characters and numbers
export const validateLatinOnly = (value: string, fieldName: string): string | null => {
  if (!value.trim()) {
    return `${fieldName} is required`
  }
  // Allow Latin, numbers, spaces, hyphens, dots, @ for email
  if (!/^[a-zA-Z0-9\s\-\.@]+$/.test(value)) {
    return `${fieldName} must contain only Latin letters, numbers and allowed characters`
  }
  return null
}

// Phone validation (only digits, hyphens, parentheses, plus, minimum 9 digits)
export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) {
    return 'Phone is required'
  }
  // Allow digits, hyphens, parentheses, plus, spaces
  if (!/^[\d\s\-\(\)\+]+$/.test(phone)) {
    return 'Phone must contain only digits and allowed characters (+, -, parentheses)'
  }
  // Check for at least 9 digits
  const digitCount = phone.replace(/\D/g, '').length
  if (digitCount < 9) {
    return 'Phone must contain at least 9 digits'
  }
  return null
}

// Email validation
export const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required'
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Invalid email format'
  }
  return null
}

// Password validation function
export const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return 'Password must contain at least 6 characters'
  }

  if (/^(\d)\1+$/.test(password)) {
    return 'Password cannot consist of only repeating digits (e.g., 111111)'
  }

  if (/^123456|234567|345678|456789|567890|654321|543210|432109|321098|210987$/.test(password)) {
    return 'Password cannot be a sequence of digits (e.g., 123456)'
  }

  const commonPasswords = ['password', '123456', '12345678', 'qwerty', 'abc123', 'password123']
  if (commonPasswords.includes(password.toLowerCase())) {
    return 'This password is too simple. Use a more complex password'
  }

  return null
}

// Validate required field
export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value.trim()) {
    return `${fieldName} is required`
  }
  return null
}

// Validate number
export const validateNumber = (value: string | number, fieldName: string, min?: number, max?: number): string | null => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return `${fieldName} must be a number`
  }
  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`
  }
  if (max !== undefined && num > max) {
    return `${fieldName} must be at most ${max}`
  }
  return null
}

// Latin characters regex for admin panel validation
// Allows: Latin letters (a-z, A-Z), numbers (0-9), spaces, hyphens, dots, underscores
// This is stricter than validateLatinOnly (no @ for emails)
export const LATIN_ONLY_REGEX = /^[a-zA-Z0-9\s\-\._]+$/

// Validation message for Latin only
export const LATIN_ONLY_MESSAGE = 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'

// Regex to detect non-Latin characters (Cyrillic, Thai, Chinese, Arabic, etc.)
export const NON_LATIN_REGEX = /[^\x00-\x7F\u00C0-\u024F]/

/**
 * Check if a string contains non-Latin characters
 * Returns true if non-English/Latin characters are detected
 */
export function hasNonLatinChars(value: string): boolean {
  if (!value) return false
  return NON_LATIN_REGEX.test(value)
}

/**
 * Get a warning message if value contains non-Latin characters
 * Returns null if valid, warning message if non-Latin chars detected
 */
export function getNonLatinWarning(value: string): string | null {
  if (hasNonLatinChars(value)) {
    return 'Please use English (Latin) characters only'
  }
  return null
}

/**
 * Standard toast message for English-only input warning
 */
export const ENGLISH_ONLY_TOAST = 'Please use English characters only'
