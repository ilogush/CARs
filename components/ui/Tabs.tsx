'use client'

import { ReactNode } from 'react'

export interface Tab {
    id: string | number
    label: string
    icon?: ReactNode
    count?: number
}

interface TabsProps {
    tabs: Tab[]
    activeTab: string | number
    onTabChange: (tabId: string | number) => void
    className?: string
    variant?: 'pill' | 'underline'
}

/**
 * Reusable Tabs component with unified styling
 * Use this for consistent tab navigation across the app
 */
export default function Tabs({ tabs, activeTab, onTabChange, className = '', variant = 'pill' }: TabsProps) {
    if (!tabs || tabs.length === 0) return null

    return (
        <div className={`flex space-x-1 bg-gray-200 p-1 rounded-full w-fit ${className}`}>
            {tabs.map((tab) => (
                <button
                    type="button"
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === tab.id
                        ? 'text-white bg-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                        }`}
                >
                    {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 text-gray-600'
                            }`}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )
}
