// Утилиты для работы с формами

export interface FormError {
  [key: string]: string
}

export interface FormState {
  values: Record<string, any>
  errors: FormError
  touched: Record<string, boolean>
  isSubmitting: boolean
}

// Функция для очистки ошибки поля
export const clearFieldError = (errors: FormError, fieldName: string): FormError => {
  if (errors[fieldName]) {
    const newErrors = { ...errors }
    delete newErrors[fieldName]
    return newErrors
  }
  return errors
}

// Функция для установки ошибки поля
export const setFieldError = (errors: FormError, fieldName: string, errorMessage: string): FormError => {
  return {
    ...errors,
    [fieldName]: errorMessage
  }
}

// Функция для проверки, есть ли ошибки в форме
export const hasErrors = (errors: FormError): boolean => {
  return Object.keys(errors).length > 0
}

// Функция для получения первой ошибки в форме
export const getFirstError = (errors: FormError): string | null => {
  const errorKeys = Object.keys(errors)
  return errorKeys.length > 0 ? errors[errorKeys[0]] : null
}

// Стандартная функция для отправки формы
export const submitForm = async (
  url: string, 
  method: 'POST' | 'PUT' | 'DELETE', 
  data: any, 
  onSuccess: () => void, 
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save data')
    }

    onSuccess()
  } catch (error) {
    onError(error instanceof Error ? error.message : 'An error occurred')
  }
}

// Функция для валидации обязательных полей
export const validateRequired = (values: Record<string, any>, requiredFields: string[]): FormError => {
  const errors: FormError = {}

  requiredFields.forEach(field => {
    if (!values[field] || (typeof values[field] === 'string' && !values[field].trim())) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
    }
  })

  return errors
}

// Функция для валидации email
export const validateEmail = (email: string): string | null => {
  if (!email) return null

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }

  return null
}

// Функция для валидации минимальной длины
export const validateMinLength = (value: string, minLength: number, fieldName?: string): string | null => {
  if (!value) return null

  if (value.length < minLength) {
    const name = fieldName || 'Field'
    return `${name} must be at least ${minLength} characters`
  }

  return null
}

// Функция для валидации максимальной длины
export const validateMaxLength = (value: string, maxLength: number, fieldName?: string): string | null => {
  if (!value) return null

  if (value.length > maxLength) {
    const name = fieldName || 'Field'
    return `${name} must be no more than ${maxLength} characters`
  }

  return null
}
