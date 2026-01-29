import { ReactNode } from 'react'
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'

interface ActionItem<T> {
  label: string
  icon?: ReactNode
  onClick: (item: T) => void
  variant?: 'primary' | 'secondary' | 'delete'
  disabled?: boolean
}

interface DataTableActionsProps<T> {
  item: T
  actions: ActionItem<T>[]
  className?: string
}

export function DataTableActions<T>({ item, actions, className = '' }: DataTableActionsProps<T>) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {actions.map((action, index) => {
        const getIcon = () => {
          if (action.icon) return action.icon

          switch (action.label.toLowerCase()) {
            case 'edit':
              return <PencilIcon className="h-4 w-4" />
            case 'delete':
              return <TrashIcon className="h-4 w-4" />
            case 'view':
            case 'details':
              return <EyeIcon className="h-4 w-4" />
            default:
              return null
          }
        }

        return (
          <Button
            key={index}
            variant={action.variant || 'secondary'}
            onClick={() => action.onClick(item)}
            disabled={action.disabled}
            className="p-2"
            title={action.label}
          >
            {getIcon()}
          </Button>
        )
      })}
    </div>
  )
}
