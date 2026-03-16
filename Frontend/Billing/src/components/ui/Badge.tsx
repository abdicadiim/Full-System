import React from 'react'
export default function Badge({ children, color='slate' }) {
  const map = {
    slate: 'bg-slate-50 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-700',
    brand: 'bg-brand/10 text-brand'
  }
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${map[color]||map.slate}`}>{children}</span>
}
