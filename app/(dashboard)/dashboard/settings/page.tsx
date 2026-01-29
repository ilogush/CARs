'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { useToast } from '@/lib/toast'
import Loader from '@/components/ui/Loader'
import { createClient } from '@/lib/supabase/client'
import SeasonsSettings from '@/components/settings/SeasonsSettings'
import DurationsSettings from '@/components/settings/DurationsSettings'
import PaymentTypesSettings from '@/components/settings/PaymentTypesSettings'
import Section from '@/components/ui/Section'
import Tabs from '@/components/ui/Tabs'
import DataTable from '@/components/ui/DataTable'
import CurrenciesSettings, { CurrenciesSettingsRef } from '@/components/settings/CurrenciesSettings'
import { ClockIcon, Cog6ToothIcon, CalendarIcon, BanknotesIcon, ShieldCheckIcon, ChatBubbleLeftIcon, BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, SunIcon, CurrencyDollarIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button, DeleteButton } from '@/components/ui/Button'
import { inputBaseStyles } from '@/lib/styles/input'
import DatePicker from '@/components/ui/DatePicker'
import { format } from 'date-fns'
import Toggle from '@/components/ui/Toggle'

type TabType = 'general' | 'schedule' | 'payments' | 'currencies'


export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center px-4 py-12"><Loader /></div>}>
            <SettingsContent />
        </Suspense>
    )
}

function SettingsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const toast = useToast()
    const currenciesRef = useRef<CurrenciesSettingsRef>(null)
    const adminMode = searchParams.get('admin_mode') === 'true'
    const companyIdParam = searchParams.get('company_id')

    const [user, setUser] = useState<any>(null)
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('general')
    const [preparationTime, setPreparationTime] = useState<number>(60)
    const [afterHoursFee, setAfterHoursFee] = useState<number>(0)
    const [telegram, setTelegram] = useState<string>('')
    const [bankDetails, setBankDetails] = useState<any>({ bank_name: '', account_number: '', account_name: '', swift: '' })
    const [banks, setBanks] = useState<any[]>([])

    const [contractTerms, setContractTerms] = useState<string>('')
    const [companyName, setCompanyName] = useState<string>('')
    const [companyEmail, setCompanyEmail] = useState<string>('')
    const [companyPhone, setCompanyPhone] = useState<string>('')
    const [companyAddress, setCompanyAddress] = useState<string>('')
    const [addrDistrict, setAddrDistrict] = useState<string>('Phuket')
    const [addrStreet, setAddrStreet] = useState<string>('')
    const [addrHouse, setAddrHouse] = useState<string>('')
    const [addrApt, setAddrApt] = useState<string>('')
    const [workSchedule, setWorkSchedule] = useState<any>({
        '0': { start: '08:00', end: '20:00', is_open: false }, // Sunday
        '1': { start: '08:00', end: '20:00', is_open: true },
        '2': { start: '08:00', end: '20:00', is_open: true },
        '3': { start: '08:00', end: '20:00', is_open: true },
        '4': { start: '08:00', end: '20:00', is_open: true },
        '5': { start: '08:00', end: '20:00', is_open: true },
        '6': { start: '08:00', end: '20:00', is_open: true },
    })

    const [holidays, setHolidays] = useState<{ id: string, date: string, name: string }[]>([])
    const [districts, setDistricts] = useState<any[]>([])

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const [banksRes, districtsRes] = await Promise.all([
                    fetch('/api/banks'),
                    fetch('/api/districts?pageSize=100')
                ])

                const banksResult = await banksRes.json()
                if (banksResult.data) setBanks(banksResult.data)

                const districtsResult = await districtsRes.json()
                if (districtsResult.data) setDistricts(districtsResult.data)
            } catch (err) {
                console.error('Error fetching initial settings data:', err)
            }
        }
        fetchInitialData()
    }, [])

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)
                const supabase = createClient()

                // Fetch user
                const { data: { user: userData } } = await supabase.auth.getUser()
                if (!userData) {
                    router.push('/auth/login')
                    return
                }

                const { data: userProfile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userData.id)
                    .single()

                setUser(userProfile)

                // Determine company ID
                let targetCompanyId = null
                if (userProfile.role === 'admin') {
                    if (adminMode && companyIdParam) {
                        targetCompanyId = parseInt(companyIdParam)
                    } else {
                        // Fetch the first available company for admin default view
                        const { data: firstCompany } = await supabase
                            .from('companies')
                            .select('id')
                            .limit(1)
                            .single()

                        if (firstCompany) {
                            targetCompanyId = firstCompany.id
                        }
                    }
                } else if (userProfile.role === 'owner' || userProfile.role === 'manager') {
                    // Get company from profile
                    const { data: scope } = await supabase.rpc('get_user_scope', { user_id: userData.id })
                    targetCompanyId = (scope as any)?.[0]?.company_id
                }

                if (targetCompanyId) {
                    const { data: companyData, error: companyError } = await supabase
                        .from('companies')
                        .select('*')
                        .eq('id', targetCompanyId)
                        .single()

                    if (companyData) {
                        setCompany(companyData)
                        setCompanyName(companyData.name || '')
                        setCompanyEmail(companyData.email || '')
                        setCompanyPhone(companyData.phone || '')
                        setCompanyAddress(companyData.address || '')

                        if (companyData.settings?.preparation_time !== undefined) {
                            setPreparationTime(companyData.settings.preparation_time)
                        }
                        if (companyData.settings?.after_hours_fee !== undefined) {
                            setAfterHoursFee(companyData.settings.after_hours_fee)
                        }
                        if (companyData.settings?.work_schedule) {
                            setWorkSchedule(companyData.settings.work_schedule)
                        }
                        if (companyData.settings?.telegram) {
                            setTelegram(companyData.settings.telegram)
                        }
                        if (companyData.settings?.bank_details) {
                            if (typeof companyData.settings.bank_details === 'string') {
                                // Fallback for old string format
                                setBankDetails({ bank_name: companyData.settings.bank_details, account_number: '', account_name: '', swift: '' })
                            } else {
                                setBankDetails(companyData.settings.bank_details)
                            }
                        }

                        if (companyData.settings?.address_parts) {
                            setAddrDistrict(companyData.settings.address_parts.district || 'Phuket')
                            setAddrStreet(companyData.settings.address_parts.street || '')
                            setAddrHouse(companyData.settings.address_parts.house || '')
                            setAddrApt(companyData.settings.address_parts.apt || '')
                        }

                        if (companyData.settings?.holidays) {
                            setHolidays(companyData.settings.holidays)
                        }

                        if (companyData.settings?.contract_terms) {

                            setContractTerms(companyData.settings.contract_terms)
                        }
                    }

                    if (userProfile.role === 'admin') {
                        // Keep current tab or switch to payments if it's the first load
                        if (activeTab === 'general' && !adminMode) {
                            setActiveTab('payments')
                        }
                    } else {
                        setActiveTab('general')
                    }
                }
            } catch (error) {
                console.error('Error fetching settings data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [adminMode, companyIdParam])

    const handleSaveSettings = async () => {
        if (!company) return

        setSaving(true)
        try {
            const newSettings = {
                ...company.settings,
                preparation_time: preparationTime,
                after_hours_fee: afterHoursFee,
                work_schedule: workSchedule,
                holidays: holidays,
                telegram: telegram,
                bank_details: bankDetails,
                contract_terms: contractTerms,
                address_parts: {
                    district: addrDistrict,
                    street: addrStreet,
                    house: addrHouse,
                    apt: addrApt
                }
            }

            const fullAddress = [addrHouse, addrStreet, addrDistrict].filter(Boolean).join(', ') + (addrApt ? ` (${addrApt})` : '')

            const response = await fetch(`/api/companies/${company.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: companyName,
                    email: companyEmail,
                    phone: companyPhone,
                    address: fullAddress,
                    settings: newSettings
                })
            })


            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Failed to update settings')
            }

            const updatedCompany = await response.json()
            setCompany(updatedCompany)
            toast.success('Settings updated successfully')
        } catch (error: any) {
            toast.error(error.message || 'Error updating settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader />
            </div>
        )
    }

    const isAdmin = user?.role === 'admin'
    const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager'
    const canSeeSettings = company && (isAdmin || isOwnerOrManager)

    // Tabs configuration
    const tabs = []
    if (canSeeSettings) {
        tabs.push({ id: 'general', label: 'General', icon: Cog6ToothIcon })
        tabs.push({ id: 'schedule', label: 'Schedule', icon: ClockIcon })
        tabs.push({ id: 'currencies', label: 'Currencies', icon: CurrencyDollarIcon })
    }


    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                rightActions={
                    <div className="flex items-center gap-2">
                        {activeTab === 'currencies' && canSeeSettings ? (
                            <Button
                                onClick={() => currenciesRef.current?.handleOpenCreate()}
                                variant="primary"
                                icon={<PlusIcon className="w-4 h-4" />}
                            >
                                Add
                            </Button>
                        ) : activeTab === 'general' && canSeeSettings && (
                            <Button
                                onClick={handleSaveSettings}
                                loading={saving}
                                variant="primary"
                            >
                                Save Settings
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Tabs */}
            {tabs.length >= 1 && (
                <Tabs
                    tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as TabType)}
                />
            )}

            {/* General Settings Section */}
            {activeTab === 'general' && canSeeSettings && (
                <div className="space-y-8">
                    <Section
                        title="Company Information"
                        description="Basic details about your company"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className={inputBaseStyles}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={companyEmail}
                                    onChange={(e) => setCompanyEmail(e.target.value)}
                                    className={inputBaseStyles}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={companyPhone}
                                    onChange={(e) => setCompanyPhone(e.target.value)}
                                    className={inputBaseStyles}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Telegram</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">@</span>
                                    <input
                                        type="text"
                                        value={telegram}
                                        onChange={(e) => setTelegram(e.target.value)}
                                        placeholder="username"
                                        className={`${inputBaseStyles} pl-7`}
                                    />
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Address Details"
                        description="Physical location and contact info"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">District</label>
                                <select
                                    value={addrDistrict}
                                    onChange={(e) => setAddrDistrict(e.target.value)}
                                    className={inputBaseStyles}
                                >
                                    <option value="">Select district</option>
                                    <option value="Phuket">Phuket (Common)</option>
                                    {districts.map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Street</label>
                                <input
                                    type="text"
                                    value={addrStreet}
                                    onChange={(e) => setAddrStreet(e.target.value)}
                                    className={inputBaseStyles}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">House Number</label>
                                <input
                                    type="text"
                                    value={addrHouse}
                                    onChange={(e) => setAddrHouse(e.target.value)}
                                    className={inputBaseStyles}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Apartment / Unit</label>
                                <input
                                    type="text"
                                    value={addrApt}
                                    onChange={(e) => setAddrApt(e.target.value)}
                                    className={inputBaseStyles}
                                />
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Booking Settings"
                        description="Configure how bookings are scheduled"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                                    Preparation Time (min)
                                </label>
                                <input
                                    type="number"
                                    value={preparationTime}
                                    onChange={(e) => setPreparationTime(parseInt(e.target.value) || 0)}
                                    className={inputBaseStyles}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                                    Delivery Fee (After Hours)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={afterHoursFee}
                                    onChange={(e) => setAfterHoursFee(parseFloat(e.target.value) || 0)}
                                    className={`${inputBaseStyles} w-full`}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {/* Schedule Settings Section */}
            {activeTab === 'schedule' && canSeeSettings && (
                <div className="space-y-6">
                    <Section
                        title="Weekly Schedule"
                        description="Days and hours when your company is normally open"
                    >
                        <DataTable
                            columns={[
                                {
                                    key: 'day',
                                    label: 'Day',
                                    render: (item: any) => (
                                        <span className="font-bold text-sm text-gray-900">{item.day}</span>
                                    )
                                },
                                {
                                    key: 'status',
                                    label: 'Status',
                                    render: (item: any) => (
                                        <div className="flex items-center gap-2">
                                            <Toggle
                                                enabled={item.is_open}
                                                onChange={() => {
                                                    const newSchedule = { ...workSchedule }
                                                    newSchedule[item.id.toString()].is_open = !newSchedule[item.id.toString()].is_open
                                                    setWorkSchedule(newSchedule)
                                                }}
                                                size="md"
                                            />
                                            <span className={`text-xs font-medium w-12 ${item.is_open ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {item.is_open ? 'Open' : 'Closed'}
                                            </span>
                                        </div>
                                    )
                                },
                                {
                                    key: 'start',
                                    label: 'Start Time',
                                    render: (item: any) => item.is_open ? (
                                        <input
                                            type="time"
                                            value={item.start}
                                            onChange={(e) => {
                                                const newSchedule = { ...workSchedule }
                                                newSchedule[item.id.toString()].start = e.target.value
                                                setWorkSchedule(newSchedule)
                                            }}
                                            className="px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg focus:ring-0 focus:border-gray-500"
                                        />
                                    ) : <span className="text-gray-400">-</span>
                                },
                                {
                                    key: 'end',
                                    label: 'End Time',
                                    render: (item: any) => item.is_open ? (
                                        <input
                                            type="time"
                                            value={item.end}
                                            onChange={(e) => {
                                                const newSchedule = { ...workSchedule }
                                                newSchedule[item.id.toString()].end = e.target.value
                                                setWorkSchedule(newSchedule)
                                            }}
                                            className="px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg focus:ring-0 focus:border-gray-500"
                                        />
                                    ) : <span className="text-gray-400">-</span>
                                }
                            ]}
                            data={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => ({
                                id: index,
                                day,
                                ...workSchedule[index.toString()]
                            }))}
                            disablePagination
                            getRowClassName={(item: any) => item.id === 0 ? 'bg-red-50/20' : ''}
                        />
                    </Section>

                    <Section
                        title="Holidays & Non-working Days"
                        description="Specific dates when your company is closed"
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-xl border border-gray-100 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                                    <DatePicker
                                        selected={null}
                                        onChange={(date) => {
                                            if (date) {
                                                const dateStr = format(date, 'yyyy-MM-dd')
                                                // Check duplicate
                                                if (holidays.some(h => h.date === dateStr)) {
                                                    toast.error('Date already exists')
                                                    return
                                                }
                                                const newHoliday = {
                                                    id: Math.random().toString(36).substr(2, 9),
                                                    date: dateStr,
                                                    name: 'Holiday'
                                                }
                                                setHolidays([...holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date)))
                                            }
                                        }}
                                        placeholderText="Select date"
                                        className={inputBaseStyles}
                                    />
                                </div>
                                <div className="text-sm text-gray-500 italic pb-2">
                                    Select a date to add a new holiday. It will appear in the list below.
                                </div>
                            </div>

                            {holidays.length > 0 ? (
                                <DataTable
                                    columns={[
                                        {
                                            key: 'date',
                                            label: 'Date',
                                            render: (row) => (
                                                <span className="font-medium text-gray-900">
                                                    {format(new Date(row.date), 'dd MMMM yyyy')}
                                                </span>
                                            )
                                        },
                                        {
                                            key: 'day',
                                            label: 'Day',
                                            render: (row) => {
                                                const date = new Date(row.date)
                                                const isSunday = date.getDay() === 0
                                                return <span className={`text-sm ${isSunday ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{format(date, 'EEEE')}</span>
                                            }
                                        },
                                        {
                                            key: 'name',
                                            label: 'Description',
                                            render: (row) => (
                                                <input
                                                    type="text"
                                                    value={row.name}
                                                    onChange={(e) => {
                                                        const updated = holidays.map(h => h.id === row.id ? { ...h, name: e.target.value } : h)
                                                        setHolidays(updated)
                                                    }}
                                                    className={`${inputBaseStyles} max-w-sm`}
                                                />
                                            )
                                        },
                                        {
                                            key: 'actions',
                                            label: ' ',
                                            className: 'w-10 text-right',
                                            render: (row) => (
                                                <DeleteButton
                                                    onClick={() => setHolidays(holidays.filter(h => h.id !== row.id))}
                                                />
                                            )
                                        }
                                    ]}
                                    data={holidays}
                                    disablePagination
                                    getRowClassName={(item: any) => {
                                        try {
                                            const date = new Date(item.date)
                                            return date.getDay() === 0 ? 'bg-red-50/20' : ''
                                        } catch (e) {
                                            return ''
                                        }
                                    }}
                                />
                            ) : (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    No holidays added yet.
                                </div>
                            )}
                        </div>
                    </Section>
                </div >
            )
            }



            {/* Payments Settings Section */}
            {
                activeTab === 'payments' && canSeeSettings && (


                    <div className="space-y-8">
                        <Section
                            title="Payment Types"
                            description="Manage the payment methods available in the system."
                            headerAction={
                                <Button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('open-payment-type-form'))
                                    }}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Add
                                </Button>
                            }
                        >
                            <PaymentTypesSettings />
                        </Section>
                    </div >
                )
            }








            {/* Currencies Settings Section */}
            {
                activeTab === 'currencies' && canSeeSettings && (
                    <CurrenciesSettings
                        ref={currenciesRef}
                        company={company}
                        onUpdateCompany={async (updates) => {
                            setSaving(true)
                            try {
                                const response = await fetch(`/api/companies/${company.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(updates)
                                })
                                if (!response.ok) throw new Error('Failed to update settings')
                                const updated = await response.json()
                                setCompany(updated)
                                toast.success('Settings updated successfully')
                            } catch (err: any) {
                                toast.error(err.message)
                            } finally {
                                setSaving(false)
                            }
                        }}
                        saving={saving}
                    />
                )
            }

            {
                !canSeeSettings && (

                    <div className="rounded-2xl p-12 text-center border border-gray-200/60 bg-white/40 backdrop-blur-sm">
                        <Cog6ToothIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Settings Restricted</h3>
                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                            {isAdmin && !adminMode
                                ? 'Please enter Admin Mode and select a company to manage settings.'
                                : 'This area is restricted to administrators only.'
                            }
                        </p>
                    </div>
                )
            }
        </div >
    )
}


