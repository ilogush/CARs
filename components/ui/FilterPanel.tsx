import { ReactNode, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'


interface FilterPanelProps {
  title?: string
  children: ReactNode
  isOpen?: boolean
  onToggle?: () => void
  className?: string
}

export function FilterPanel({
  title = 'Filters',
  children,
  isOpen: controlledIsOpen,
  onToggle,
  className = ''
}: FilterPanelProps) {
  // Используем внутреннее состояние, если компонент не контролируется извне
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Определяем, контролируется ли компонент извне
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle()
    } else {
      setInternalIsOpen(!internalIsOpen)
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleToggle}
      >
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <button
          className="p-1 rounded-lg hover:bg-gray-300 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
        >
          {isOpen ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )
}
