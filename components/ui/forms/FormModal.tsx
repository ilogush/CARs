import { ReactNode } from 'react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface FormModalProps {
  title: string
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void
  submitLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'large'
}

export function FormModal({
  title,
  isOpen,
  onClose,
  children,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  maxWidth = 'lg'
}: FormModalProps) {
  return (
    <Modal
      title={title}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
