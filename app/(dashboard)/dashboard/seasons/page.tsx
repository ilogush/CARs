'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import Loader from '@/components/ui/Loader'
import SeasonsSettings from '@/components/settings/SeasonsSettings'

export default function SeasonsPage() {
    const toast = useToast()
    const [locations, setLocations] = useState<any[]>([])
    const [activeLocationId, setActiveLocationId] = useState<number | null>(null)
    const [seasons, setSeasons] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingSeasons, setLoadingSeasons] = useState(false)
    const [saving, setSaving] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)

    useEffect(() => {
        async function init() {
            setLoading(true)
            try {
                const supabase = createClient()
                const { data: { user: userData } } = await supabase.auth.getUser()
                if (userData) {
                    const { data: profile } = await supabase.from('users').select('role').eq('id', userData.id).single()
                    setUserRole(profile?.role || null)
                }

                const { data: locs } = await supabase.from('locations').select('*').order('name')
                if (locs) {
                    setLocations(locs)
                    if (locs.length > 0) setActiveLocationId(locs[0].id)
                }
            } catch (error) {
                console.error('Error initializing seasons page:', error)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    useEffect(() => {
        if (activeLocationId) {
            fetchSeasons(activeLocationId)
        }
    }, [activeLocationId])

    async function fetchSeasons(locId: number) {
        setLoadingSeasons(true)
        try {
            const res = await fetch(`/api/location-seasons?locationId=${locId}`)
            const result = await res.json()
            if (result.data) {
                setSeasons(result.data)
            }
        } catch (error) {
            console.error('Error fetching seasons:', error)
        } finally {
            setLoadingSeasons(false)
        }
    }

    const handleSave = async (updatedSeasons: any) => {
        if (!activeLocationId) return
        setSaving(true)
        try {
            const response = await fetch('/api/location-seasons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId: activeLocationId,
                    seasons: updatedSeasons.seasons
                })
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Failed to update seasons')
            }

            toast.success('Seasons updated successfully')
            fetchSeasons(activeLocationId)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader /></div>
    if (locations.length === 0) return <div className="p-12 text-center text-gray-500">No locations found</div>

    const isAdmin = userRole === 'admin'

    return (
        <div className="space-y-6">
            {loadingSeasons ? (
                <div className="flex justify-center p-12"><Loader /></div>
            ) : (
                <SeasonsSettings
                    company={{ settings: { seasons } }}
                    onSave={handleSave}
                    saving={saving}
                    readOnly={!isAdmin}
                    tabs={locations.map(l => ({ id: l.id, label: l.name }))}
                    activeTab={activeLocationId || ''}
                    onTabChange={(id) => setActiveLocationId(Number(id))}
                />
            )}

            {!isAdmin && (
                <p className="text-sm text-gray-500 italic mt-4 text-center">
                    Only administrators can modify global season settings.
                </p>
            )}
        </div>
    )
}

