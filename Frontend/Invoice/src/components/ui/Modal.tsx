import React from 'react'

export default function Modal({ open, title, children, onClose }) {
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-[95%] max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-[12px] hover:bg-slate-50">Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}
