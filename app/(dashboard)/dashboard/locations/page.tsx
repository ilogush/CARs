'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { PlusIcon, MapPinIcon, PencilIcon } from '@heroicons/react/24/outline'
import DataTable, { Column } from '@/components/ui/DataTable'
import Tabs from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import { Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/lib/toast'
import { Button, DeleteButton } from '@/components/ui/Button'
import IdBadge from '@/components/ui/IdBadge'
import Loader from '@/components/ui/Loader'
import { DistrictForm } from '@/components/forms/DistrictForm'
import Modal from '@/components/ui/Modal'
import { inputBaseStyles } from '@/lib/styles/input'
import { logAction } from '@/lib/audit'
import DetailGrid from '@/components/ui/DetailGrid'
import DetailField from '@/components/ui/DetailField'

type Location = Database['public']['Tables']['locations']['Row']
type District = Database['public']['Tables']['districts']['Row']

export default function LocationsPage() {
  const searchParams = useSearchParams()
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [switchingTab, setSwitchingTab] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // District management state
  const [showDistrictModal, setShowDistrictModal] = useState(false)
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null)

  // Location management state
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [editedLocationName, setEditedLocationName] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)

  // Delivery prices state
  const [deliveryPrices, setDeliveryPrices] = useState<any[]>([])
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [savingPrices, setSavingPrices] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyIdParam = searchParams.get('company_id')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(profile)

      let targetCompanyId = null
      if (profile?.role === 'admin' && adminMode && companyIdParam) {
        targetCompanyId = parseInt(companyIdParam)
      } else if (profile?.role === 'owner') {
        const { data: ownComp } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', authUser.id)
          .single()
        targetCompanyId = ownComp?.id
      } else if (profile?.role === 'manager') {
        const { data: managedComp } = await supabase
          .from('managers')
          .select('company_id')
          .eq('user_id', authUser.id)
          .single()
        targetCompanyId = managedComp?.company_id
      }

      if (targetCompanyId) {
        const { data: comp } = await supabase
          .from('companies')
          .select('*, locations(*)')
          .eq('id', targetCompanyId)
          .single()
        setCompany(comp)

        if (comp) {
          setSelectedLocationId(comp.location_id)
          loadDeliveryPrices(comp.id)
        }
      }
    }
    init()
  }, [adminMode, companyIdParam])

  async function loadDeliveryPrices(compId: number) {
    setLoadingPrices(true)
    try {
      const res = await fetch(`/api/companies/${compId}/delivery-prices`)
      const result = await res.json()
      if (result.data) {
        setDeliveryPrices(result.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPrices(false)
      setPage(1)
    }
  }

  const handlePriceChange = (districtId: number, field: string, value: any) => {
    setDeliveryPrices(prev => prev.map(p =>
      p.district_id === districtId ? { ...p, [field]: value } : p
    ))
  }

  const handleSavePrices = async () => {
    if (!company) return
    const hasFree = deliveryPrices.some(p => p.is_active && Number(p.price) === 0)
    if (!hasFree) {
      toast.error('At least one active district must have zero delivery cost (Free Delivery)')
      return
    }

    setSavingPrices(true)
    try {
      const res = await fetch(`/api/companies/${company.id}/delivery-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryPrices.map(p => ({
          district_id: p.district_id,
          price: Number(p.price) || 0,
          is_active: !!p.is_active
        })))
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save prices')
      }

      toast.success('Delivery prices saved')
      loadDeliveryPrices(company.id)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingPrices(false)
    }
  }

  const requestVersionRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (user?.role !== 'admin' || (adminMode && company)) return

    async function loadLocations() {
      const supabase = createClient()
      const { data } = await supabase
        .from('locations')
        .select('*')
        .order('id', { ascending: true })

      if (data) {
        setLocations(data)
        if (data.length > 0 && !selectedLocationId) {
          setSelectedLocationId(data[0].id)
        }
      }
      setLoadingLocations(false)
    }
    loadLocations()
  }, [user, adminMode, company])

  const fetchDistricts = useCallback(async (params: any) => {
    if (!selectedLocationId) return { data: [], totalCount: 0 }
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    const currentVersion = ++requestVersionRef.current
    const currentLocationId = selectedLocationId

    const searchParams = new URLSearchParams()
    searchParams.set('page', params.page.toString())
    searchParams.set('pageSize', params.pageSize.toString())
    searchParams.set('locationId', currentLocationId.toString())

    if (params.sortBy) {
      searchParams.set('sortBy', params.sortBy)
      searchParams.set('sortOrder', params.sortOrder || 'asc')
    }
    if (params.filters) searchParams.set('filters', JSON.stringify(params.filters))

    try {
      const response = await fetch(
        `/api/districts?${searchParams.toString()}&_t=${Date.now()}`,
        { signal: abortController.signal }
      )
      if (currentVersion !== requestVersionRef.current) return { data: [], totalCount: 0 }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load districts')
      }
      const result = await response.json()
      if (currentVersion !== requestVersionRef.current) return { data: [], totalCount: 0 }
      return result
    } catch (error: any) {
      if (error.name === 'AbortError') return { data: [], totalCount: 0 }
      throw error
    }
  }, [selectedLocationId])

  const handleSaveDistrict = async (data: any) => {
    const supabase = createClient()
    let error
    if (editingDistrict) {
      const { error: err } = await supabase
        .from('districts')
        .update({ name: data.name, location_id: data.location_id })
        .eq('id', editingDistrict.id)
      error = err
    } else {
      const { error: err } = await supabase
        .from('districts')
        .insert([{ name: data.name, location_id: data.location_id }])
      error = err
    }

    if (error) {
      console.error('Error saving district:', error)
      if ((error as any).code === '23505') {
        toast.error('A district with this name already exists in this location')
      } else {
        toast.error(error.message || 'Failed to save district')
      }
      return
    }

    toast.success(editingDistrict ? 'District updated' : 'District created')
    setShowDistrictModal(false)
    setEditingDistrict(null)
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteDistrict = async (id: number) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('districts')
      .delete()
      .eq('id', id)
    if (error) {
      toast.error('Failed to delete district')
      return
    }
    toast.success('District deleted')
    setRefreshKey(prev => prev + 1)
    if (showDistrictModal) {
      setShowDistrictModal(false)
      setEditingDistrict(null)
    }
  }

  const handleUpdateLocation = async () => {
    if (!editedLocationName.trim() || !selectedLocationId) return
    setSavingLocation(true)
    const supabase = createClient()
    const theLocation = locations.find(l => l.id === selectedLocationId)
    const { error } = await supabase.from('locations').update({ name: editedLocationName.trim() }).eq('id', selectedLocationId)

    if (error) {
      toast.error('Failed to update location')
      setSavingLocation(false)
      return
    }

    await logAction({
      entity_type: 'locations',
      entity_id: selectedLocationId.toString(),
      action: 'update',
      before_state: { name: theLocation?.name },
      after_state: { name: editedLocationName.trim() }
    })

    setLocations(prev => prev.map(l => l.id === selectedLocationId ? { ...l, name: editedLocationName.trim() } : l))
    setShowLocationModal(false)
    setSavingLocation(false)
    toast.success('Location updated')
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocationId) return
    const supabase = createClient()
    const { count } = await supabase
      .from('districts')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', selectedLocationId)
    
    if (count && count > 0) {
      toast.error('Cannot delete location with districts')
      return
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', selectedLocationId)
    
    if (error) {
      toast.error('Failed to delete location')
      return
    }

    setLocations(prev => prev.filter(l => l.id !== selectedLocationId))
    setSelectedLocationId(locations.find(l => l.id !== selectedLocationId)?.id || null)
    toast.success('Location deleted')
  }

  const districtColumns: Column<District>[] = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      render: (row) => (
        <button onClick={() => { setEditingDistrict(row); setShowDistrictModal(true); }}>
          <IdBadge>{row.id.toString().padStart(4, '0')}</IdBadge>
        </button>
      )
    },
    {
      key: 'name',
      label: 'District Name',
      sortable: true,
      render: (row) => (
        <button
          onClick={() => { setEditingDistrict(row); setShowDistrictModal(true); }}
          className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors text-left"
        >
          {row.name}
        </button>
      )
    },
  ], []) // No Actions column

  const isSystemAdmin = user?.role === 'admin'
  const isCompanyUser = company && (user?.role === 'owner' || user?.role === 'manager' || (user?.role === 'admin' && adminMode))
  const showDeliveryCosts = adminMode || (user?.role !== 'admin' && isCompanyUser)
  const showGlobalManagement = isSystemAdmin && !adminMode
  const currentLocation = locations.find(l => l.id === selectedLocationId)

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title={showGlobalManagement ? "Locations & Districts" : "Delivery Costs"}
        actionLabel={showGlobalManagement ? "Add" : undefined}
        actionIcon={showGlobalManagement ? <PlusIcon className="w-4 h-4" /> : undefined}
        actionType={showGlobalManagement ? "button" : undefined}
        onAction={showGlobalManagement ? () => { setEditingDistrict(null); setShowDistrictModal(true); } : undefined}
        rightActions={user?.role === 'owner' || user?.role === 'manager' || (user?.role === 'admin' && adminMode) ? (
          <Button onClick={handleSavePrices} disabled={savingPrices} loading={savingPrices}>Save</Button>
        ) : undefined}
      />

      {showGlobalManagement && (
        <>
          <Tabs
            tabs={locations.map((loc) => ({ id: loc.id, label: loc.name }))}
            activeTab={selectedLocationId || ''}
            onTabChange={(tabId) => {
              if (selectedLocationId === tabId) return
              setSwitchingTab(true)
              setSelectedLocationId(tabId as number)
              setTimeout(() => setSwitchingTab(false), 0)
            }}
          />

          {selectedLocationId && currentLocation && (
            <div className="mt-8 space-y-6">
              {switchingTab ? <div className="flex items-center justify-center p-12"><Loader /></div> : (
                <DataTable key={`${selectedLocationId}-${refreshKey}`} columns={districtColumns} fetchData={fetchDistricts} />
              )}
            </div>
          )}
        </>
      )}

      {showDeliveryCosts && (
        <div className="space-y-6">
          {loadingPrices ? <div className="flex justify-center items-center py-20"><Loader /></div> : (
            <>
              <DataTable
                columns={[
                  { key: 'id', label: 'ID', render: (p) => <IdBadge>{(p.id || '').toString().padStart(4, '0')}</IdBadge> },
                  { key: 'name', label: 'District Name', render: (p: any) => <span className="text-sm font-medium text-gray-900">{p.name}</span> },
                  {
                    key: 'status', label: 'Status', render: (p: any) => (
                      <button onClick={() => handlePriceChange(p.district_id, 'is_active', !p.is_active)} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${p.is_active ? 'bg-gray-800' : 'bg-gray-200'}`} role="switch" aria-checked={p.is_active}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${p.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    )
                  },
                  {
                    key: 'price', label: 'Delivery Cost (฿)', render: (p: any) => (
                      <div className="relative w-full max-w-[150px]">
                        <input type="number" min="0" step="50" value={p.price === null ? '' : p.price} onChange={(e) => handlePriceChange(p.district_id, 'price', e.target.value)} disabled={!p.is_active} placeholder="0" className="block w-full border-gray-300 rounded-lg shadow-sm text-sm py-1.5 px-3 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:bg-gray-50 transition-all font-medium" />
                        <span className="absolute right-3 top-2 text-gray-400 text-xs">฿</span>
                      </div>
                    )
                  }
                ]}
                fetchData={async () => ({ data: deliveryPrices, totalCount: deliveryPrices.length })}
                refreshKey={JSON.stringify(deliveryPrices)}
              />
              {deliveryPrices.length === 0 && (
                <div className="py-20 text-center"><MapPinIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" /><p className="text-gray-400 font-medium">No districts found for this location.</p></div>
              )}
            </>
          )}
        </div>
      )}

      {showDistrictModal && (
        <DistrictForm
          district={editingDistrict as any}
          locations={locations}
          defaultLocationId={selectedLocationId!}
          onSubmit={handleSaveDistrict}
          onCancel={() => { setShowDistrictModal(false); setEditingDistrict(null); }}
          onDelete={editingDistrict ? () => handleDeleteDistrict(editingDistrict.id) : undefined}
        />
      )}

      {showLocationModal && (
        <Modal title="Edit Location" onClose={() => setShowLocationModal(false)} actions={<Button onClick={handleUpdateLocation} loading={savingLocation} variant="primary">Save</Button>}>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Location Name</label>
              <input type="text" value={editedLocationName} onChange={(e) => setEditedLocationName(e.target.value)} className={inputBaseStyles} autoFocus />
            </div>
          </div>
        </Modal>
      )}

      {locations.length === 0 && !company && !loadingLocations && (
        <EmptyState icon={<MapPinIcon className="h-12 w-12" />} title="No locations" description="Get started by creating a new location." />
      )}
    </div>
  )
}
