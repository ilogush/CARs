import { ReactNode } from 'react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps {
  label?: string
  options: SelectOption[]
  value?: string | number | (string | number)[]
  onChange?: (value: string | number | (string | number)[]) => void
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
  name?: string
  multiple?: boolean
  size?: number
}

export function Select({
  label,
  options,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder,
  className = '',
  id,
  name,
  multiple = false,
  size
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      if (multiple) {
        // Для множественного выбора возвращаем массив выбранных значений
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
        onChange(selectedOptions)
      } else {
        onChange(e.target.value)
      }
    }
  }

  // Для множественного выбора value должен быть массивом
  const selectValue = multiple
    ? (Array.isArray(value) ? value.map(String) : []) // Convert numbers to strings
    : String(value ?? '')

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-gray-500 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id || name}
        name={name}
        value={selectValue}
        onChange={handleChange}
        disabled={disabled}
        multiple={multiple}
        size={size}
        className={`block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${error ? 'border-red-500' : ''
          } ${disabled ? 'bg-gray-200 cursor-not-allowed' : ''}`}
      >
        {!multiple && placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {multiple && (
        <p className="mt-1 text-xs text-gray-500">
          Hold Ctrl (Cmd on Mac) to select multiple options.
          Selected: {Array.isArray(selectValue) ? selectValue.length : 0}
        </p>
      )}
    </div>
  )
}
