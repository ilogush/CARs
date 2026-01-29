'use client'

import { useState, useEffect, useRef } from 'react'

interface CitizenshipAutocompleteProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
  placeholder?: string
}

interface Citizenship {
  id: number
  name: string
  code: string
}

export default function CitizenshipAutocomplete({
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  placeholder = 'Start typing...'
}: CitizenshipAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Citizenship[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 1) {
        setSuggestions([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/citizenships?search=${encodeURIComponent(value)}`)
        if (response.ok) {
          const { data } = await response.json()
          setSuggestions(data || [])
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error('Error fetching citizenships:', error)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timer)
  }, [value])

  const handleSelect = (citizenship: Citizenship) => {
    onChange(citizenship.name)
    setShowSuggestions(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    if (!e.target.value) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleFocus = () => {
    if (value && suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        disabled={disabled}
        required={required}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {loading && (
        <div className="absolute right-3 top-2.5">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((citizenship) => (
            <button
              key={citizenship.id}
              type="button"
              onClick={() => handleSelect(citizenship)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900">{citizenship.name}</span>
                <span className="text-xs text-gray-500">{citizenship.code}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
