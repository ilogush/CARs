'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import Loader from '@/components/ui/Loader'
import DurationsSettings from '@/components/settings/DurationsSettings'

export default function DurationsPage() {
    const searchParams = useSearchParams()
    const toast = useToast()
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const adminMode = searchParams.get('admin_mode') === 'true'
    const companyIdParam = searchParams.get('company_id')

    useEffect(() => {
        async function fetchCompany() {
            setLoading(true)
            try {
                const supabase = createClient()
                const { data: { user: userData } } = await supabase.auth.getUser()
                if (!userData) return

                const { data: userProfile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userData.id)
                    .single()

                let targetCompanyId = null
                if (userProfile.role === 'admin') {
                    if (adminMode && companyIdParam) {
                        targetCompanyId = parseInt(companyIdParam)
                    } else {
                        const { data: firstCompany } = await supabase
                            .from('companies')
                            .select('id')
                            .limit(1)
                            .single()
                        if (firstCompany) targetCompanyId = firstCompany.id
                    }
                } else if (userProfile.role === 'owner' || userProfile.role === 'manager') {
                    const { data: scope } = await supabase.rpc('get_user_scope', { user_id: userData.id })
                    targetCompanyId = (scope as any)?.[0]?.company_id
                }

                if (targetCompanyId) {
                    const { data } = await supabase
                        .from('companies')
                        .select('*')
                        .eq('id', targetCompanyId)
                        .single()
                    setCompany(data)
                }
            } catch (error) {
                console.error('Error loading company:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchCompany()
    }, [adminMode, companyIdParam])

    const handleSave = async (newSettings: any) => {
        setSaving(true)
        try {
            const response = await fetch(`/api/companies/${company.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: newSettings })
            })
            if (!response.ok) throw new Error('Failed to update settings')

            const updated = await response.json()
            setCompany(updated)
            toast.success('Durations updated successfully')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader /></div>
    if (!company) return <div className="p-12 text-center text-gray-500">Company not found</div>

    return (
        <div className="space-y-6">
            <DurationsSettings
                company={company}
                onSave={handleSave}
                saving={saving}
            />
        </div>
    )
}
