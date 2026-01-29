'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Manager } from '@/types/database.types'
import { useToast } from '@/lib/toast'

interface ManagersListProps {
  companyId: number
  initialManagers: (Manager & { user?: { email: string } })[]
}

export default function ManagersList({ companyId, initialManagers }: ManagersListProps) {
  const toast = useToast()
  const [managers, setManagers] = useState(initialManagers)
  const [showAddForm, setShowAddForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      })

      if (authError) throw authError

      if (authData.user) {
        // Create user record with manager role
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email.trim(),
            role: 'manager',
          })

        if (userError) throw userError

        // Create manager record
        const { data: managerData, error: managerError } = await supabase
          .from('managers')
          .insert({
            user_id: authData.user.id,
            company_id: companyId,
            is_active: true,
          })
          .select(`
            *,
            user:users(email)
          `)
          .single()

        if (managerError) throw managerError

        toast.success('Manager added successfully')
        setManagers([managerData, ...managers])
        setEmail('')
        setPassword('')
        setShowAddForm(false)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }

    setLoading(false)
  }

  const handleToggleActive = async (managerId: number, currentStatus: boolean) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('managers')
      .update({ is_active: !currentStatus })
      .eq('id', managerId)
      .select(`
        *,
        user:users(email)
      `)
      .single()

    if (error) {
      toast.error('Ошибка: ' + error.message)
    } else {
      setManagers(managers.map(m => m.id === managerId ? data : m))
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Managers</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {showAddForm ? 'Cancel' : '+ Add Manager'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Manager'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {managers.length === 0 ? (
            <p className="text-gray-500 text-sm">No managers</p>
          ) : (
            managers.map((manager) => (
              <div
                key={manager.id}
                className="py-2 px-4 border border-gray-200 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-900">{manager.user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${manager.is_active ? 'bg-gray-200 text-gray-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {manager.is_active ? 'active' : 'blocked'}
                  </span>
                  <button
                    onClick={() => handleToggleActive(manager.id, manager.is_active)}
                    className={`px-2 py-1 text-sm font-medium rounded transition-colors ${manager.is_active
                      ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                  >
                    {manager.is_active ? 'Block' : 'Unblock'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

