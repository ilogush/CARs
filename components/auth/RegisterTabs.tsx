'use client'

import { useState } from 'react'
import RegisterUserForm from './RegisterUserForm'
import RegisterOwnerForm from './RegisterOwnerForm'
import type { Location, Currency } from '@/types/database.types'

interface RegisterTabsProps {
  locations: Location[]
  currencies: Currency[]
}

export default function RegisterTabs({ locations, currencies }: RegisterTabsProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'owner'>('user')

  return (
    <div className="mt-8">
      {/* Tabs - no background and borders */}
      <div className="flex space-x-8 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('user')}
          className={`text-sm font-medium transition-colors ${
            activeTab === 'user'
              ? 'text-gray-800 border-b-2 border-gray-800 pb-2'
              : 'text-gray-500 hover:text-gray-500'
          }`}
        >
          User
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('owner')}
          className={`text-sm font-medium transition-colors ${
            activeTab === 'owner'
              ? 'text-gray-800 border-b-2 border-gray-800 pb-2'
              : 'text-gray-500 hover:text-gray-500'
          }`}
        >
          Company Owner
        </button>
      </div>

      {/* Forms */}
      <div>
        {activeTab === 'user' && <RegisterUserForm />}
        {activeTab === 'owner' && <RegisterOwnerForm locations={locations} currencies={currencies} />}
      </div>
    </div>
  )
}

