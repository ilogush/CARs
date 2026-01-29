'use client'

import { useState, useEffect } from 'react'
import { validateLatinOnly } from '@/lib/validation'
import { Button, DeleteButton } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/forms/Input'
import { Select } from '@/components/ui/forms/Select'
import { inputBaseStyles, inputErrorStyles, textareaBaseStyles } from '@/lib/styles/input'

interface PaymentType {
  id: number
  name: string
  sign: '+' | '-'
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  is_used?: boolean
}

interface PaymentTypeFormProps {
  paymentType?: PaymentType | null
  onSubmit: (data: any) => void
  onDelete?: (type: PaymentType) => void
  onCancel: () => void
}

export function PaymentTypeForm({ paymentType, onSubmit, onDelete, onCancel }: PaymentTypeFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    sign: '+' as '+' | '-',
    description: '',
    is_active: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (paymentType) {
      setFormData({
        name: paymentType.name,
        sign: paymentType.sign,
        description: paymentType.description || '',
        is_active: paymentType.is_active
      })
    }
  }, [paymentType])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === 'sign') {
      setFormData(prev => ({ ...prev, [name]: value as '+' | '-' }))
    } else if (name === 'is_active') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Payment type name is required'
    } else {
      const latinError = validateLatinOnly(formData.name, 'Payment type name')
      if (latinError) {
        newErrors.name = latinError
      }
    }

    if (!['+', '-'].includes(formData.sign)) {
      newErrors.sign = 'Sign must be either + or -'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    // Если тип используется, не позволяем изменять sign и is_active
    if (paymentType?.is_used) {
      onSubmit({
        name: formData.name.trim(),
        sign: paymentType.sign, // Используем оригинальное значение
        description: formData.description.trim(),
        is_active: paymentType.is_active // Используем оригинальное значение
      })
    } else {
      onSubmit({
        name: formData.name.trim(),
        sign: formData.sign,
        description: formData.description.trim(),
        is_active: formData.is_active
      })
    }
  }

  return (
    <Modal
      title={paymentType ? 'Edit Payment Type' : 'Create Payment Type'}
      onClose={onCancel}
      actions={
        <div className="flex items-center justify-end gap-3 w-full">
          {paymentType && onDelete && (
            <DeleteButton
              onClick={() => onDelete(paymentType)}
              title="Delete payment type"
            />
          )}
          <Button
            type="submit"
            form="payment-type-form"
            variant="primary"
          >
            {paymentType ? 'Save' : 'Add'}
          </Button>
        </div>
      }
    >
      <form id="payment-type-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Payment Type Name"
            required
            value={formData.name}
            onChange={(val) => {
              setFormData(prev => ({ ...prev, name: val }))
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
            }}
            error={errors.name}
            placeholder="e.g., Fuel, Repair, Deposit"
          />

          <div>
            <Select
              label="Sign Type"
              required
              options={[
                { value: '+', label: 'Income (+)' },
                { value: '-', label: 'Expense (-)' }
              ]}
              value={formData.sign}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, sign: val as '+' | '-' }))
                if (errors.sign) setErrors(prev => ({ ...prev, sign: '' }))
              }}
              disabled={!!paymentType?.is_used}
              error={errors.sign}
            />
            <p className="mt-1 text-sm text-gray-500">
              {paymentType?.is_used
                ? 'This payment type is used in the system and cannot be modified'
                : formData.sign === '+'
                  ? 'This payment type represents money coming in (income)'
                  : 'This payment type represents money going out (expense)'}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-500 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className={textareaBaseStyles}
            placeholder="Optional description of what this payment type means"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="is_active" className={`block text-sm font-medium ${paymentType?.is_used ? 'text-gray-500' : 'text-gray-500'}`}>
            Active {paymentType?.is_used && <span className="text-xs">(Cannot be changed)</span>}
          </label>
          <button
            type="button"
            onClick={() => {
              if (!paymentType?.is_used) {
                setFormData(prev => ({ ...prev, is_active: !prev.is_active }))
              }
            }}
            disabled={paymentType?.is_used}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${formData.is_active ? 'bg-gray-800' : 'bg-gray-200'
              } ${paymentType?.is_used ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={formData.is_active}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_active ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
          </button>
        </div>

      </form>
    </Modal>
  )
}
