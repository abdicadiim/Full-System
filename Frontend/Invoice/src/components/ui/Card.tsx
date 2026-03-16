import React from 'react'
export default function Card({ className='', children }) {
  return (
    <div className={`rounded-xl bg-white border border-slate-200 shadow-card ${className}`}>
      {children}
    </div>
  )
}
