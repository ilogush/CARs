import { ReactNode } from 'react'

interface CheckboxProps {
  label?: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  error?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  required?: boolean
}

export function Checkbox({
  label,
  checked = false,
  onChange,
  error,
  disabled = false,
  className = '',
  id,
  name,
  required = false
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.checked)
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center">
        <input
          type="checkbox"
          id={id || name}
          name={name}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className={`h-4 w-4 rounded border-gray-200 text-gray-900 focus:ring-gray-500 ${
            error ? 'border-red-500' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {label && (
          <label htmlFor={id || name} className={`ml-2 block text-xs text-gray-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
