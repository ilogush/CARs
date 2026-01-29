import { useState, useRef, useEffect } from 'react'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'

export interface ActionItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

interface ActionMenuProps {
  trigger?: React.ReactNode
  items: ActionItem[]
  className?: string
}

export function ActionMenu({ trigger, items, className = '' }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getItemClasses = (variant: string = 'secondary', disabled: boolean = false) => {
    const baseClasses = 'flex items-center space-x-2 w-full text-left px-4 py-2 text-sm'

    if (disabled) {
      return `${baseClasses} text-gray-500 cursor-not-allowed`
    }

    switch (variant) {
      case 'primary':
        return `${baseClasses} text-gray-900 hover:bg-gray-300`
      case 'danger':
        return `${baseClasses} text-red-600 hover:bg-gray-300`
      case 'secondary':
      default:
        return `${baseClasses} text-gray-500 hover:bg-gray-300`
    }
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-lg hover:bg-gray-300 transition-colors"
      >
        {trigger || <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick()
                    setIsOpen(false)
                  }
                }}
                className={getItemClasses(item.variant, item.disabled)}
                disabled={item.disabled}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
