import { useState, ReactNode } from 'react'

interface FormWrapperProps {
  children: ReactNode | ((props: any) => ReactNode)
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => void
  validate?: (data: Record<string, any>) => Record<string, string>
}

export function FormWrapper({ children, initialData = {}, onSubmit, validate }: FormWrapperProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    // Очищаем ошибку для поля, если пользователь начал вводить данные
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Валидация, если предоставлена функция валидации
    if (validate) {
      const validationErrors = validate(formData)
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData(initialData)
    setErrors({})
  }

  const setFieldValue = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const setFieldError = (name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  return (
    <form onSubmit={handleSubmit}>
      {typeof children === 'function'
        ? children({
          formData,
          errors,
          isSubmitting,
          handleChange,
          setFieldValue,
          setFieldError,
          resetForm
        })
        : children
      }
    </form>
  )
}
