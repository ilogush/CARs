import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  leftActions?: ReactNode
  rightActions?: ReactNode
}

export default function PageHeader({ title, subtitle, leftActions, rightActions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div className="flex items-center space-x-4">
        {leftActions && <div className="flex items-center space-x-2">{leftActions}</div>}
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {rightActions && <div className="flex items-center space-x-2">{rightActions}</div>}
    </div>
  )
}
