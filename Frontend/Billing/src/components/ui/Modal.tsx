import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title?: React.ReactNode
  children: React.ReactNode
  onClose: () => void
  position?: 'center' | 'top'
  panelClassName?: string
  closeMode?: 'text' | 'icon'
  closeOnBackdrop?: boolean
}

export default function Modal({
  open,
  title,
  children,
  onClose,
  position = 'center',
  panelClassName = '',
  closeMode = 'text',
  closeOnBackdrop = true,
}: ModalProps) {
  if (!open) return null

  const containerClassName =
    position === 'top'
      ? 'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6 sm:py-10'
      : 'fixed inset-0 z-50 flex items-center justify-center px-4 py-6'

  return (
    <div className={containerClassName}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={closeOnBackdrop ? onClose : undefined} />
      <div className={`relative z-10 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-card ${panelClassName}`.trim()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-semibold">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={
              closeMode === 'icon'
                ? 'inline-flex h-9 w-9 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-600'
                : 'rounded-lg border border-slate-200 px-2 py-1 text-[12px] hover:bg-slate-50'
            }
          >
            {closeMode === 'icon' ? <X size={18} /> : 'Close'}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
