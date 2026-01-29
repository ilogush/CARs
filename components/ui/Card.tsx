import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  return (
    <div className={`bg-white/40 backdrop-blur-sm rounded-xl border border-gray-200/60 ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}
