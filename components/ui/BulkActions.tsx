import { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'
import { ActionMenu, ActionItem } from './ActionMenu'

interface BulkActionItem<T> {
  label: string
  icon?: React.ReactNode
  onClick: (items: T[]) => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

interface BulkActionsProps<T> {
  items: T[]
  selectedItems: T[]
  onSelectionChange: (selectedItems: T[]) => void
  actions: BulkActionItem<T>[]
  getItemId: (item: T) => string | number
  className?: string
}

export function BulkActions<T>({ 
  items, 
  selectedItems, 
  onSelectionChange, 
  actions, 
  getItemId,
  className = ''
}: BulkActionsProps<T>) {
  const [isAllSelected, setIsAllSelected] = useState(false)

  // Проверяем, все ли элементы выбраны
  const allItemsSelected = items.length > 0 && selectedItems.length === items.length

  // Обработчик выбора/снятия выбора всех элементов
  const handleSelectAll = () => {
    if (allItemsSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange([...items])
    }
    setIsAllSelected(!allItemsSelected)
  }

  // Обработчик выбора/снятия выбора отдельного элемента
  const handleSelectItem = (item: T) => {
    const itemId = getItemId(item)
    const isSelected = selectedItems.some(selectedItem => getItemId(selectedItem) === itemId)

    if (isSelected) {
      onSelectionChange(selectedItems.filter(selectedItem => getItemId(selectedItem) !== itemId))
    } else {
      onSelectionChange([...selectedItems, item])
    }
  }

  // Преобразуем действия для ActionMenu
  const menuActions: ActionItem[] = actions.map(action => ({
    label: action.label,
    icon: action.icon,
    onClick: () => action.onClick(selectedItems),
    variant: action.variant,
    disabled: action.disabled || selectedItems.length === 0
  }))

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSelectAll}
            className={`flex items-center justify-center w-5 h-5 rounded border ${
              allItemsSelected 
                ? 'bg-gray-800 border-gray-800' 
                : 'border-gray-200'
            }`}
          >
            {allItemsSelected && <CheckIcon className="h-3 w-3 text-white" />}
          </button>

          <span className="text-sm text-gray-500">
            {selectedItems.length > 0 
              ? `${selectedItems.length} of ${items.length} selected`
              : `${items.length} items`
            }
          </span>
        </div>

        {selectedItems.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={() => onSelectionChange([])}
            >
              Clear Selection
            </Button>

            <ActionMenu items={menuActions} />
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          Selected items: {selectedItems.map(item => getItemId(item)).join(', ')}
        </div>
      )}
    </div>
  )
}
