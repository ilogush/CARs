'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAdminMode } from '@/components/admin/AdminModeProvider'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import { useToast } from '@/lib/toast'
import { inputBaseStyles } from '@/lib/styles/input'

interface ChatMessage {
  id: number
  company_id: number
  message: string
  created_by: string
  created_at: string
  created_by_user?: {
    id: string
    name: string | null
    surname: string | null
    email: string
    avatar_url: string | null
  }
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const { isAdminMode, companyId: adminCompanyId } = useAdminMode()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageText, setMessageText] = useState('')
  const toast = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const effectiveCompanyId = (adminMode && companyId) ? parseInt(companyId) : (isAdminMode && adminCompanyId) ? adminCompanyId : null


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [effectiveCompanyId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const queryParams = new URLSearchParams()
      if (effectiveCompanyId) {
        queryParams.set('company_id', effectiveCompanyId.toString())
      }
      if (adminMode) {
        queryParams.set('admin_mode', 'true')
      }

      const response = await fetch(`/api/chat?${queryParams.toString()}`)

      let responseData
      try {
        responseData = await response.json()
      } catch (e) {
        // Response might not be JSON or might be empty
      }

      // Handle expected 400 error for admin without company
      if (response.status === 400 && responseData?.error === 'Company ID is required') {
        setMessages([])
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorMessage = responseData?.error || `Failed to fetch messages (${response.status})`
        throw new Error(errorMessage)
      }

      setMessages(responseData?.data || [])
      if (loading) {
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error)
      if (loading) {
        setLoading(false)
      }

      // Don't show toast for "Company ID is required" error as it's an expected state for admins
      if (error.message !== 'Company ID is required') {
        toast.error(error.message || 'Error loading messages')
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageText.trim()) {
      return
    }

    setSending(true)
    try {
      const body: { message: string; company_id?: number } = {
        message: messageText.trim(),
      }

      if (effectiveCompanyId) {
        body.company_id = effectiveCompanyId
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      setMessageText('')
      await fetchMessages()
      toast.success('Message sent')
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || 'Error sending message')
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) {
      return 'Just now'
    } else if (minutes < 60) {
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else if (days < 7) {
      return `${days}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    }
  }

  const getUserDisplayName = (message: ChatMessage) => {
    if (message.created_by_user) {
      const name = message.created_by_user.name
      const surname = message.created_by_user.surname
      if (name || surname) {
        return [name, surname].filter(Boolean).join(' ')
      }
    }
    return message.created_by_user?.email || 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Company Chat" />

      <div className="flex flex-col h-[calc(100vh-200px)] border border-gray-200 rounded-lg bg-white">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.created_by_user?.avatar_url ? (
                    <img
                      src={message.created_by_user.avatar_url}
                      alt={getUserDisplayName(message)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                      {getUserDisplayName(message).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Message content */}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {getUserDisplayName(message)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatMessageTime(message.created_at)}
                    </span>
                  </div>
                  <div className="text-gray-500 whitespace-pre-wrap break-words">
                    {message.message}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              placeholder="Type your message..."
              className={`${inputBaseStyles} flex-1 resize-none`}
              rows={2}
              disabled={sending}
            />
            <Button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="self-end"
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </div>

    </div>
  )
}
