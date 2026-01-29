import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface InfoCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  trend?: {
    value: number
    isPositive: boolean
  }
  href?: string
  className?: string
}

export function InfoCard({
  title,
  value,
  icon,
  color = 'primary',
  size = 'md',
  trend,
  href,
  className = ''
}: InfoCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200'
    },
    secondary: {
      bg: 'bg-gray-50',
      icon: 'text-gray-600',
      border: 'border-gray-200'
    },
    success: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-200'
    },
    warning: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-600',
      border: 'border-yellow-200'
    },
    error: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      border: 'border-red-200'
    }
  }

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const currentColor = colorClasses[color]
  const currentSize = sizeClasses[size]

  const cardContent = (
    <div className={`bg-white rounded-lg border border-gray-200 ${currentSize} ${className} hover:border-gray-200 transition-colors cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>

          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        {icon && (
          <div className={`${currentColor.bg} rounded-lg p-3`}>
            <div className={currentColor.icon}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
