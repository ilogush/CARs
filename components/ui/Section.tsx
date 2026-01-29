import { ReactNode } from 'react'

interface SectionProps {
    title?: string
    description?: string
    children: ReactNode
    className?: string
    headerAction?: ReactNode
}

/**
 * Unified Section component for grouping content
 * Uses border-bottom instead of card borders per .cursorrules
 */
export default function Section({
    title,
    description,
    children,
    className = '',
    headerAction
}: SectionProps) {
    return (
        <div className={className}>
            {(title || description || headerAction) && (
                <div className="flex items-center justify-between mb-6">
                    <div>
                        {title && (
                            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        )}
                        {description && (
                            <p className="mt-1 text-sm text-gray-500">{description}</p>
                        )}
                    </div>
                    {headerAction && (
                        <div>{headerAction}</div>
                    )}
                </div>
            )}
            {children}
        </div>
    )
}
