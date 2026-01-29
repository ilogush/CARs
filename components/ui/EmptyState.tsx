import { ReactNode } from 'react'
import { Button } from './Button'
import { PlusIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  type?: 'default' | 'search' | 'data'
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  type = 'default',
  className = ''
}: EmptyStateProps) {
  const getDefaultIcon = () => {
    switch (type) {
      case 'search':
        return <MagnifyingGlassIcon className="h-12 w-12 text-gray-500" />
      case 'data':
        return <DocumentTextIcon className="h-12 w-12 text-gray-500" />
      default:
        return <PlusIcon className="h-12 w-12 text-gray-500" />
    }
  }

  const getDefaultTitle = () => {
    switch (type) {
      case 'search':
        return 'No results found'
      case 'data':
        return 'No data available'
      default:
        return 'Nothing here yet'
    }
  }

  const getDefaultDescription = () => {
    switch (type) {
      case 'search':
        return 'Try adjusting your search or filter criteria'
      case 'data':
        return 'Data will appear here once available'
      default:
        return 'Get started by creating your first item'
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="flex flex-col items-center space-y-4 max-w-md">
        {icon || getDefaultIcon()}

        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {title || getDefaultTitle()}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {description || getDefaultDescription()}
          </p>
        </div>

        {action && (
          <Button
            variant={action.variant || 'primary'}
            onClick={action.onClick}
            className="mt-2"
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
