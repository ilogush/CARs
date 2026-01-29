import { ReactNode } from 'react'

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'custom'
  label?: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusIndicator({
  status,
  label,
  color,
  size = 'md',
  className = ''
}: StatusIndicatorProps) {
  const statusConfig = {
    online: {
      color: 'bg-green-500',
      label: 'Online'
    },
    offline: {
      color: 'bg-gray-500',
      label: 'Offline'
    },
    busy: {
      color: 'bg-red-500',
      label: 'Busy'
    },
    away: {
      color: 'bg-yellow-500',
      label: 'Away'
    },
    custom: {
      color: color || 'bg-gray-500',
      label: label || 'Custom'
    }
  }

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const currentStatus = statusConfig[status]
  const currentSize = sizeClasses[size]

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${currentSize} ${currentStatus.color} rounded-full`} />
      {label && (
        <span className="text-sm text-gray-500">{label}</span>
      )}
    </div>
  )
}
