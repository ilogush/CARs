'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAdminMode } from '@/components/admin/AdminModeProvider'
import { useToast } from '@/lib/toast'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { inputBaseStyles } from '@/lib/styles/input'
import CustomDatePicker from '@/components/ui/DatePicker'

interface CalendarEvent {
  id: number
  title: string
  description?: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  event_type: string
  color: string
  created_by: string
  created_by_user?: {
    name: string
    surname: string
  }
}

interface DayEvent {
  date: Date
  events: CalendarEvent[]
}

export default function CalendarPage() {
  const searchParams = useSearchParams()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const { isAdminMode, companyId: adminCompanyId } = useAdminMode()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const effectiveCompanyId = (adminMode && companyId) ? parseInt(companyId) : (isAdminMode && adminCompanyId) ? adminCompanyId : null


  useEffect(() => {
    fetchEvents()
  }, [currentDate, effectiveCompanyId])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      })

      if (effectiveCompanyId) {
        queryParams.set('company_id', effectiveCompanyId.toString())
        if (adminMode) {
          queryParams.set('admin_mode', 'true')
        }
      }

      const response = await fetch(`/api/calendar-events?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Error loading calendar events')
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: DayEvent[] = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({
        date: new Date(year, month, -startingDayOfWeek + i + 1),
        events: []
      })
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day)
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.event_date)
        return eventDate.toDateString() === dayDate.toDateString()
      })
      days.push({
        date: dayDate,
        events: dayEvents
      })
    }

    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    setSelectedDate(new Date(event.event_date))
    setShowEventModal(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!effectiveCompanyId) {
      toast.error('Company ID is required')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      const eventData = {
        company_id: effectiveCompanyId,
        title: String(formData.get('title') || '').trim(),
        description: String(formData.get('description') || '').trim() || null,
        event_date: selectedDate?.toISOString().split('T')[0] || '',
        start_time: String(formData.get('start_time') || '').trim() || null,
        end_time: String(formData.get('end_time') || '').trim() || null,
        event_type: String(formData.get('event_type') || 'general'),
        color: String(formData.get('color') || '#3B82F6')
      }

      if (!eventData.title) {
        toast.error('Title is required')
        return
      }

      const url = selectedEvent
        ? `/api/calendar-events/${selectedEvent.id}`
        : '/api/calendar-events'
      const method = selectedEvent ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save event')
      }

      toast.success(`Event ${selectedEvent ? 'updated' : 'created'} successfully`)
      setShowEventModal(false)
      setSelectedEvent(null)
      setSelectedDate(null)
      fetchEvents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving event')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return

    setSaving(true)
    try {
      const response = await fetch(`/api/calendar-events/${selectedEvent.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete event')
      }

      toast.success('Event deleted successfully')
      setShowEventModal(false)
      setSelectedEvent(null)
      setSelectedDate(null)
      fetchEvents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting event')
    } finally {
      setSaving(false)
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = getDaysInMonth(currentDate)

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className="space-y-6">

      <PageHeader
        title="Calendar"
        rightActions={
          <Button
            variant="primary"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => {
              setSelectedDate(new Date())
              setSelectedEvent(null)
              setShowEventModal(true)
            }}
          >
            Create Event
          </Button>
        }
      />

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map(day => (
              <div key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((dayEvent, index) => {
              const isDayToday = isToday(dayEvent.date)
              const isDayCurrentMonth = isCurrentMonth(dayEvent.date)

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(dayEvent.date)}
                  className={`
                    min-h-[100px] border-r border-b border-gray-200 p-2 cursor-pointer
                    transition-colors hover:bg-gray-50
                    ${!isDayCurrentMonth ? 'bg-gray-50 text-gray-500' : ''}
                    ${isDayToday ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${isDayToday ? 'text-blue-600' : isDayCurrentMonth ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    {dayEvent.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvent.events.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className="text-xs px-2 py-1 rounded truncate text-white"
                        style={{ backgroundColor: event.color }}
                        title={event.title}
                      >
                        {event.start_time ? `${event.start_time.substring(0, 5)} ` : ''}{event.title}
                      </div>
                    ))}
                    {dayEvent.events.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">
                        +{dayEvent.events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <Modal
          onClose={() => {
            setShowEventModal(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
          title={selectedEvent ? 'Edit Event' : 'Create Event'}
          actions={
            <div className="flex justify-end gap-3 w-full">
              {selectedEvent && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowEventModal(false)
                  setSelectedEvent(null)
                  setSelectedDate(null)
                }}
                disabled={saving}
                className="px-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="event-form"
                disabled={saving}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : selectedEvent ? 'Update' : 'Create'}
              </button>
            </div>
          }
        >
          <form id="event-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-500 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                defaultValue={selectedEvent?.title || ''}
                className={inputBaseStyles}
                placeholder="Event title"
              />
            </div>

            <div className="md:col-span-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-500 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={selectedEvent?.description || ''}
                className={inputBaseStyles}
                placeholder="Event description"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="event_date" className="block text-sm font-medium text-gray-500 mb-1">
                Date *
              </label>
              <CustomDatePicker
                id="event_date"
                name="event_date"
                required
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholderText="Select event date"
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-500 mb-1">
                Start Time
              </label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                defaultValue={selectedEvent?.start_time || ''}
                className={inputBaseStyles}
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-500 mb-1">
                End Time
              </label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                defaultValue={selectedEvent?.end_time || ''}
                className={inputBaseStyles}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="event_type" className="block text-sm font-medium text-gray-500 mb-1">
                Event Type
              </label>
              <select
                id="event_type"
                name="event_type"
                defaultValue={selectedEvent?.event_type || 'general'}
                className={inputBaseStyles}
              >
                <option value="general">General</option>
                <option value="meeting">Meeting</option>
                <option value="maintenance">Maintenance</option>
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="color" className="block text-sm font-medium text-gray-500 mb-1">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color"
                  name="color"
                  defaultValue={selectedEvent?.color || '#3B82F6'}
                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  defaultValue={selectedEvent?.color || '#3B82F6'}
                  onChange={(e) => {
                    const colorInput = document.getElementById('color') as HTMLInputElement
                    if (colorInput) colorInput.value = e.target.value
                  }}
                  className={`flex-1 ${inputBaseStyles}`}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
