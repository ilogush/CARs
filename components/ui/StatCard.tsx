import { ReactNode } from 'react'

interface StatCardProps {
  children: ReactNode
  className?: string
}

export default function StatCard({ children, className = '' }: StatCardProps) {
  return (
    <div className={`bg-gray-50 rounded-lg p-3 border border-gray-200 ${className}`}>
      {children}
    </div>
  )
}
