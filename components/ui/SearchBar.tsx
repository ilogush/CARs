import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Input } from './forms/Input'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  debounceMs?: number
  className?: string
}

export function SearchBar({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSearch,
  debounceMs = 300,
  className = ''
}: SearchBarProps) {
  // Используем внутреннее состояние, если компонент не контролируется извне
  const [internalValue, setInternalValue] = useState('')

  // Определяем, контролируется ли компонент извне
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  // Для задержки выполнения поиска
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleChange = (newValue: string) => {
    if (isControlled && onChange) {
      onChange(newValue)
    } else {
      setInternalValue(newValue)
    }

    // Отменяем предыдущий таймаут
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Устанавливаем новый таймаут для выполнения поиска
    const newTimeout = setTimeout(() => {
      if (onSearch) {
        onSearch(newValue)
      }
    }, debounceMs)

    setSearchTimeout(newTimeout)
  }

  const handleClear = () => {
    handleChange('')
  }

  // Очищаем таймаут при размонтировании компонента
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  return (
    <div className={`relative ${className}`}>
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`pl-10 pr-10 ${value ? 'pr-10' : ''}`}
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
      </div>
      {value && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
          onClick={handleClear}
          title="Clear search"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500 hover:text-gray-600" />
        </button>
      )}
    </div>
  )
}
