import React from 'react'
import Card from '../../components/ui/Card'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

function Stat({ label, value, delta, up=true }) {
  return (
    <Card className="p-5">
      <div className="text-[12px] text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <div className={`flex items-center gap-1 text-[12px] ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{delta}</span>
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Billing Dashboard</h1>
          <p className="text-[13px] text-slate-500">Quick snapshot of revenue, invoices and customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="MRR" value="$42,600" delta="+6.1%" up />
        <Stat label="ARR" value="$511,200" delta="+8.4%" up />
        <Stat label="Overdues" value="$3,910" delta="-2.2%" up={false} />
        <Stat label="Active Customers" value="1,284" delta="+1.3%" up />
      </div>
    </div>
  )
}
