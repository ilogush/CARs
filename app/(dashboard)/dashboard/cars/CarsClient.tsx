'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { carsApi } from '@/lib/api/cars'
import { locationsApi, Location } from '@/lib/api/locations'
import { CarBrand, CarModel, CarTemplate, CarReferenceData } from '@/types/cars'
import { useToast } from '@/lib/toast'
import { useAdminMode } from '@/components/admin/AdminModeProvider'
import DataTable, { Column } from '@/components/ui/DataTable'
import { Button, DeleteButton } from '@/components/ui/Button'
import { CarTemplateForm } from '@/components/forms/CarTemplateForm'
import { CarModelForm } from '@/components/forms/CarModelForm'
import { BrandForm } from '@/components/forms/BrandForm'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import Loader from '@/components/ui/Loader'
import IdBadge from '@/components/ui/IdBadge'
import ActionPageHeader from '@/components/ui/ActionPageHeader'


type TabType = 'brands' | 'models' | 'templates' | 'inventory'

interface CarsClientProps {
  initialBrands: CarBrand[]
  initialModels: CarModel[]
  initialLocations: Location[]
  initialReferenceData: any
  userRole: string | null
}

export default function CarsClient({
  initialBrands,
  initialModels,
  initialLocations,
  initialReferenceData,
  userRole: serverUserRole
}: CarsClientProps) {
  const toast = useToast()
  const router = useRouter()
  const { isAdminMode, companyId } = useAdminMode()
  const [userRole, setUserRole] = useState<string | null>(serverUserRole)
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab')
      if (tab === 'brands' || tab === 'models' || tab === 'templates' || tab === 'inventory') {
        return tab as TabType
      }
    }
    // Default to inventory if looking at specific company
    if (companyId) return 'inventory'
    return 'templates'
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  // Brands state
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [showBrandDetailsModal, setShowBrandDetailsModal] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<CarBrand | null>(null)
  const [editingBrand, setEditingBrand] = useState<CarBrand | null>(null)

  // Models state
  const [showModelForm, setShowModelForm] = useState(false)
  const [showModelDetailsModal, setShowModelDetailsModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null)
  const [editingModel, setEditingModel] = useState<CarModel | null>(null)

  // Templates state
  const [editingTemplate, setEditingTemplate] = useState<CarTemplate | null>(null)
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false)
  const [showTemplateDetailsModal, setShowTemplateDetailsModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CarTemplate | null>(null)

  // Company Car state (for Owner view)
  const [selectedCar, setSelectedCar] = useState<any>(null)
  const [showCarDetailsModal, setShowCarDetailsModal] = useState(false)

  const [brands, setBrands] = useState<CarBrand[]>(initialBrands)
  const [models, setModels] = useState<CarModel[]>(initialModels)
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const [referenceData, setReferenceData] = useState<any>(initialReferenceData)

  // Removed modal state - using page redirect instead

  useEffect(() => {
    // We already have initial data from props,
    // but we can keep this for future refresh logic if needed
    setLoading(false)
  }, [])

  // User role is passed from server component

  // Data is managed by DataTable via fetchData props and refreshKey

  // Brands handlers
  const handleBrandCreate = () => {
    setEditingBrand(null)
    setShowBrandForm(true)
  }

  const handleBrandIdClick = (brand: CarBrand) => {
    setSelectedBrand(brand)
    setShowBrandDetailsModal(true)
  }

  const handleBrandEdit = (brand: CarBrand) => {
    setShowBrandDetailsModal(false)
    setEditingBrand(brand)
    setShowBrandForm(true)
  }

  const handleBrandDelete = async (brand: CarBrand) => {
    try {
      await carsApi.deleteBrand(brand.id)
      toast.success(`Brand "${brand.name}" deleted successfully`)
      setShowBrandDetailsModal(false)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      const { formatErrorMessage } = await import('@/lib/error-handler')
      toast.error(formatErrorMessage(error))
    }
  }

  const handleBrandFormSubmit = async (formData: any) => {
    try {
      if (editingBrand) {
        await carsApi.updateBrand(editingBrand.id, {
          ...formData,
          updated_at: editingBrand.updated_at // For Optimistic Locking
        })
        toast.success(`Brand "${formData.name}" updated successfully`)
      } else {
        await carsApi.createBrand(formData)
        toast.success(`Brand "${formData.name}" created successfully`)
      }

      setShowBrandForm(false)
      setEditingBrand(null)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      const { formatErrorMessage } = await import('@/lib/error-handler')
      toast.error(formatErrorMessage(error))
    }
  }

  const fetchBrandsData = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      return await carsApi.getBrands(params)
    } catch (error) {
      toast.error('Error loading brands')
      return { data: [], totalCount: 0 }
    }
  }

  // Models handlers
  const handleModelCreate = () => {
    setEditingModel(null)
    setShowModelForm(true)
  }

  const handleModelIdClick = (model: CarModel) => {
    setSelectedModel(model)
    setShowModelDetailsModal(true)
  }

  const handleModelEdit = (model: CarModel) => {
    setShowModelDetailsModal(false)
    setEditingModel(model)
    setShowModelForm(true)
  }

  const handleModelDelete = async (model: CarModel) => {
    try {
      await carsApi.deleteModel(model.id)
      toast.success(`Car model "${model.name}" deleted successfully`)
      setShowModelDetailsModal(false)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      const { formatErrorMessage } = await import('@/lib/error-handler')
      toast.error(formatErrorMessage(error))
    }
  }

  const handleModelFormSubmit = async (formData: any) => {
    try {
      if (editingModel) {
        await carsApi.updateModel(editingModel.id, {
          ...formData,
          updated_at: editingModel.updated_at // For Optimistic Locking
        })
        toast.success('Car model updated successfully')
      } else {
        await carsApi.createModel(formData)
        toast.success('Car model created successfully')
      }

      setShowModelForm(false)
      setEditingModel(null)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      const { formatErrorMessage } = await import('@/lib/error-handler')
      toast.error(formatErrorMessage(error))
    }
  }

  const fetchModelsData = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      return await carsApi.getModels(params)
    } catch (error) {
      toast.error('Error loading car models')
      return { data: [], totalCount: 0 }
    }
  }

  // I will view the file first
  const fetchCarTemplates = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      return await carsApi.getTemplates(params)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load car templates')
      return { data: [], totalCount: 0 }
    }
  }

  const handleTemplateDelete = async (template: CarTemplate) => {
    try {
      await carsApi.deleteTemplate(template.id)
      toast.success('Car template deleted successfully')
      setShowTemplateDetailsModal(false)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
    }
  }

  const handleTemplateIdClick = (template: CarTemplate) => {
    setSelectedTemplate(template)
    setShowTemplateDetailsModal(true)
  }

  const handleTemplateEdit = (template: CarTemplate) => {
    setShowTemplateDetailsModal(false)
    setEditingTemplate(template)
    setIsTemplateFormOpen(true)
  }

  const handleTemplateFormSubmit = async (formData: any) => {
    try {
      if (editingTemplate) {
        await carsApi.updateTemplate(editingTemplate.id, formData)
        toast.success(`Car template updated successfully`)
      } else {
        await carsApi.createTemplate(formData)
        toast.success(`Car template created successfully`)
      }
      setIsTemplateFormOpen(false)
      setEditingTemplate(null)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast.error(error.message || 'Error saving car template')
    }
  }

  // Company Car handlers (Owner view)
  const handleCarClick = (car: any) => {
    setSelectedCar(car)
    setShowCarDetailsModal(true)
  }

  const handleCarEdit = (car: any) => {
    setShowCarDetailsModal(false)
    if (isAdminMode && companyId) {
      router.push(`/dashboard/cars/${car.id}/edit?admin_mode=true&company_id=${companyId}`)
    } else {
      router.push(`/dashboard/cars/${car.id}/edit`)
    }
  }

  const handleCarDelete = async (car: any) => {
    try {
      await carsApi.deleteCompanyCar(car.id, {
        admin_mode: isAdminMode,
        company_id: companyId || undefined
      })

      const brand = car.car_templates?.car_brands?.name || ''
      const model = car.car_templates?.car_models?.name || ''
      toast.success(`Car "${brand} ${model}" deleted successfully`)
      setShowCarDetailsModal(false)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting car')
    }
  }

  // Determine available tabs based on role and mode
  const isOwnerView = userRole === 'owner' || userRole === 'manager' || (isAdminMode && !!companyId)

  const getPhotoUrl = (photo: string | null | undefined, carId?: number) => {
    if (!photo) return null
    return photo.startsWith('http') ? photo : `/uploads/${photo}`
  }

  // Columns for Company Cars (Inventory)
  const companyCarsColumns: Column<any>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item) => {
        const displayId = item.id.toString().padStart(4, '0')
        const href = isAdminMode && companyId
          ? `/dashboard/cars/${item.id}?admin_mode=true&company_id=${companyId}`
          : `/dashboard/cars/${item.id}`

        return (
          <Link href={href} className="cursor-pointer">
            <IdBadge>{displayId}</IdBadge>
          </Link>
        )
      }
    },
    {
      key: 'photo',
      label: 'Photo',
      render: (item) => {
        const href = isAdminMode && companyId
          ? `/dashboard/cars/${item.id}?admin_mode=true&company_id=${companyId}`
          : `/dashboard/cars/${item.id}`

        const firstPhoto = item.photos?.[0]
        const photoUrl = getPhotoUrl(firstPhoto, item.id)

        return (
          <Link href={href} className="block relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Car photo"
                className="w-16 h-16 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const placeholder = target.nextElementSibling as HTMLElement
                  if (placeholder) placeholder.style.display = 'flex'
                }}
              />
            ) : null}
            <div className={`w-12 h-12 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-300 transition-colors ${photoUrl ? 'hidden' : ''}`}>
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </Link>
        )
      }
    },
    {
      key: 'car',
      label: 'Car',
      render: (item) => {
        const brand = item.car_templates?.car_brands?.name || '-'
        const model = item.car_templates?.car_models?.name || '-'
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {brand} {model}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {item.license_plate ? `#${item.license_plate}` : '-'}
            </div>
          </div>
        )
      }
    },
    {
      key: 'color',
      label: 'Color',
      render: (item) => (
        <span className="text-sm text-gray-900 break-words whitespace-normal">
          {item.car_colors?.name || '-'}
        </span>
      )
    },
    {
      key: 'body_type',
      label: 'Body Type',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-900">
          {item.car_templates?.car_body_types?.name || item.car_templates?.body_type || '-'}
        </span>
      )
    },
    {
      key: 'body_year',
      label: 'Year',
      render: (item) => (
        <span className="text-sm text-gray-900">
          {item.car_templates?.body_production_start_year || '-'}
        </span>
      )
    },
    {
      key: 'seat_count',
      label: 'Seats',
      render: (item) => (
        <span className="text-sm text-gray-900">
          {item.car_templates?.car_seat_counts?.count || '-'}
        </span>
      )
    },
    {
      key: 'mileage',
      label: 'Mileage',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-900">
          {(item.mileage || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <StatusBadge
          variant={
            item.status === 'available' ? 'success' :
              item.status === 'rented' ? 'info' :
                'warning'
          }
        >
          {item.status?.toLowerCase() || 'available'}
        </StatusBadge>
      )
    }
  ]

  // Brands columns
  const brandsColumns: Column<CarBrand>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item) => {
        const displayId = item.id.toString().padStart(4, '0')
        return (
          <button
            onClick={() => handleBrandIdClick(item)}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </button>
        )
      }
    },
    {
      key: 'name',
      label: 'Brand Name',
      sortable: true
    }
  ]

  // Models columns
  const modelsColumns: Column<CarModel>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item) => {
        const displayId = item.id.toString().padStart(4, '0')
        return (
          <button
            onClick={() => handleModelIdClick(item)}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </button>
        )
      }
    },
    {
      key: 'name',
      label: 'Model Name',
      sortable: true
    },
    {
      key: 'car_brands.name',
      label: 'Brand',
      sortable: true,
      render: (item) => item.car_brands?.name || '-'
    }
  ]

  // Templates columns
  const templatesColumns: Column<CarTemplate>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item, index, page, pageSize) => {
        const displayId = item.id.toString().padStart(4, '0')
        return (
          <button
            onClick={() => handleTemplateIdClick(item)}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </button>
        )
      }
    },
    {
      key: 'brand',
      label: 'Brand',
      sortable: true,
      render: (item) => item.car_brands?.name || '-'
    },
    {
      key: 'model',
      label: 'Model',
      sortable: true,
      render: (item) => item.car_models?.name || '-'
    },
    {
      key: 'body_type',
      label: 'Body Type',
      sortable: true,
      render: (item) => item.car_body_types?.name || item.body_type || '-'
    },
    {
      key: 'car_class',
      label: 'Class',
      sortable: true,
      render: (item) => item.car_classes?.name || item.car_class || '-'
    },
    {
      key: 'fuel_type',
      label: 'Fuel',
      sortable: true,
      render: (item) => item.car_fuel_types?.name || item.fuel_type || '-'
    },
    {
      key: 'year',
      label: 'Year',
      sortable: true,
      render: (item) => item.body_production_start_year || '-'
    }
  ]

  // Data Fetchers
  const fetchCompanyCarsData = async (params: any) => {
    try {
      return await carsApi.getCompanyCars({
        ...params,
        admin_mode: isAdminMode,
        company_id: companyId || undefined,
      })
    } catch (error: any) {
      throw new Error(error.message || 'Failed to load data')
    }
  }

  // Construct tabs array
  const dynamicTabs: any[] = []

  if (isOwnerView) {
    dynamicTabs.push({
      id: 'inventory',
      label: 'Inventory',
      columns: companyCarsColumns,
      fetchData: fetchCompanyCarsData
    })
  }

  if (userRole === 'admin' && !companyId) {
    dynamicTabs.push(
      {
        id: 'templates',
        label: 'Car Templates',
        columns: templatesColumns,
        fetchData: fetchCarTemplates
      },
      {
        id: 'brands',
        label: 'Brands',
        columns: brandsColumns,
        fetchData: fetchBrandsData
      },
      {
        id: 'models',
        label: 'Models',
        columns: modelsColumns,
        fetchData: fetchModelsData
      }
    )
  }

  // Handle header actions based on active tab
  const getHeaderAction = () => {
    const tabId = activeTab || (isOwnerView ? 'inventory' : 'templates')

    switch (tabId) {
      case 'inventory':
        return {
          actionLabel: 'Add Car',
          actionIcon: <PlusIcon className="w-4 h-4" />,
          actionType: 'link' as const,
          href: isAdminMode && companyId
            ? `/dashboard/cars/create?admin_mode=true&company_id=${companyId}`
            : '/dashboard/cars/create'
        }
      case 'templates':
        return {
          actionLabel: 'Create Template',
          actionIcon: <PlusIcon className="w-4 h-4" />,
          onAction: () => {
            setEditingTemplate(null)
            setIsTemplateFormOpen(true)
          }
        }
      case 'brands':
        return {
          actionLabel: 'Create Brand',
          actionIcon: <PlusIcon className="w-4 h-4" />,
          onAction: handleBrandCreate
        }
      case 'models':
        return {
          actionLabel: 'Create Model',
          actionIcon: <PlusIcon className="w-4 h-4" />,
          onAction: handleModelCreate
        }
      default:
        return {}
    }
  }

  const headerProps = getHeaderAction()

  // Show loading state while initial data is being fetched
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title={activeTab === 'inventory' ? "My Cars" : "Cars Management"}
        {...headerProps}
      />

      <DataTable
        key={`${activeTab}-${refreshKey}`}
        tabs={dynamicTabs}
        defaultTabId={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId as any)
          const url = new URL(window.location.href)
          url.searchParams.set('tab', tabId)
          window.history.replaceState({}, '', url)
        }}
        emptyAction={
          headerProps.onAction ? {
            label: headerProps.actionLabel || 'Add Item',
            onClick: headerProps.onAction
          } : headerProps.href ? {
            label: headerProps.actionLabel || 'Add Item',
            onClick: () => router.push(headerProps.href!)
          } : undefined
        }
      />


      {/* Brand Form Modal */}
      {showBrandForm && (
        <BrandForm
          brand={editingBrand}
          onSubmit={handleBrandFormSubmit}
          onCancel={() => {
            setShowBrandForm(false)
            setEditingBrand(null)
          }}
        />
      )}

      {/* Brand Details Modal */}
      {showBrandDetailsModal && selectedBrand && (
        <Modal
          title={`Brand: ${selectedBrand.name}`}
          onClose={() => {
            setShowBrandDetailsModal(false)
            setSelectedBrand(null)
          }}
          actions={
            <>
              <Button
                type="button"
                onClick={() => handleBrandEdit(selectedBrand)}
                variant="primary"
              >
                Edit
              </Button>
              <DeleteButton onClick={() => handleBrandDelete(selectedBrand)} />
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedBrand.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedBrand.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Model Form Modal */}
      {showModelForm && (
        <CarModelForm
          model={editingModel}
          brands={brands}
          onSubmit={handleModelFormSubmit}
          onCancel={() => {
            setShowModelForm(false)
            setEditingModel(null)
          }}
        />
      )}

      {/* Model Details Modal */}
      {showModelDetailsModal && selectedModel && (
        <Modal
          title={`Car Model: ${selectedModel.name}`}
          onClose={() => {
            setShowModelDetailsModal(false)
            setSelectedModel(null)
          }}
          actions={
            <>
              <Button
                type="button"
                onClick={() => handleModelEdit(selectedModel)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton onClick={() => handleModelDelete(selectedModel)} />
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedModel.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Brand</label>
                <p className="mt-1 text-sm text-gray-900">{selectedModel.car_brands?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedModel.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Template Form Modal */}
      {isTemplateFormOpen && (
        <CarTemplateForm
          template={editingTemplate || undefined}
          brands={brands}
          models={models}
          locations={locations}
          referenceData={referenceData}
          onSubmit={async (formData) => {
            await handleTemplateFormSubmit(formData)
          }}
          onCancel={() => {
            setIsTemplateFormOpen(false)
            setEditingTemplate(null)
          }}
        />
      )}

      {/* Template Details Modal */}
      {showTemplateDetailsModal && selectedTemplate && (
        <Modal
          title={`Template: ${selectedTemplate.car_brands?.name || ''} ${selectedTemplate.car_models?.name || ''}`}
          onClose={() => {
            setShowTemplateDetailsModal(false)
            setSelectedTemplate(null)
          }}
          actions={
            <>
              <Button
                type="button"
                onClick={() => handleTemplateEdit(selectedTemplate)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton onClick={() => handleTemplateDelete(selectedTemplate)} />
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Brand</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_brands?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Model</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_models?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Body Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_body_types?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Class</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_classes?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Fuel Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_fuel_types?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Year</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.body_production_start_year || '-'}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Car Details Modal */}
      {showCarDetailsModal && selectedCar && (
        <Modal
          title={`${selectedCar.car_templates?.car_brands?.name || ''} ${selectedCar.car_templates?.car_models?.name || ''}`}
          onClose={() => {
            setShowCarDetailsModal(false)
            setSelectedCar(null)
          }}
          actions={
            <>
              <Button
                type="button"
                onClick={() => handleCarEdit(selectedCar)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton onClick={() => handleCarDelete(selectedCar)} />
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">License Plate</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCar.license_plate || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Color</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCar.car_colors?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <StatusBadge
                    variant={
                      selectedCar.status === 'available' ? 'success' :
                        selectedCar.status === 'rented' ? 'info' :
                          'warning'
                    }
                  >
                    {selectedCar.status?.toLowerCase() || 'available'}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Price/Day</label>
                <p className="mt-1 text-sm text-gray-900">${parseFloat(selectedCar.price_per_day || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mileage</label>
                <p className="mt-1 text-sm text-gray-900">{(selectedCar.mileage || 0).toLocaleString()} km</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Location</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCar.car_locations?.name || '-'}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
