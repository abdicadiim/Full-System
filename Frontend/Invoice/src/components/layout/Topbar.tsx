import React from 'react'
import { Search, Bell, User, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOrgs } from '../../state/orgsContext'

export default function Topbar() {
  const { activeOrg } = useOrgs()
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-[1400px] h-full flex items-center gap-4 px-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 w-full max-w-xl">
            <Search size={16} className="text-slate-400" />
            <input className="bg-transparent outline-none text-[13px] flex-1" placeholder="Search invoices, customers, products..." />
          </div>
        </div>
        <Link to="/orgs" className="hidden md:flex items-center gap-2 text-[12px] rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50">
          <Building2 size={16} />
          <span>{activeOrg?.name || 'Select Org'}</span>
        </Link>
        <button className="relative rounded-full p-2 hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-teal/10 text-teal flex items-center justify-center">
          <User size={16} />
        </div>
      </div>
    </header>
  )
}
