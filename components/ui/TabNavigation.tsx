import { ReactNode } from 'react'

interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
}

interface TabNavigationProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function TabNavigation({ tabs, activeTab, onChange, className = '' }: TabNavigationProps) {
  return (
    <div className={`flex space-x-1 bg-gray-200 p-1 rounded-lg ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'
            }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge && (
            <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'text-white bg-gray-500'
              }`}>
              {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
