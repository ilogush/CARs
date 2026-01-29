import { ReactNode } from 'react'

interface InputProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date'
  className?: string
  id?: string
  name?: string
  min?: number | string
  max?: number | string
  addonRight?: ReactNode
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  type = 'text',
  className = '',
  id,
  name,
  min,
  max,
  addonRight
}: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  const inputClasses = `block w-full border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${error ? 'border-red-500' : ''
    } ${disabled ? 'bg-gray-200 cursor-not-allowed' : ''} ${addonRight ? 'rounded-l-lg' : 'rounded-lg'}`

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-gray-500 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={addonRight ? 'flex rounded-lg shadow-sm' : ''}>
        <input
          type={type}
          id={id || name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          className={inputClasses}
        />
        {addonRight && (
          <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm">
            {addonRight}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
