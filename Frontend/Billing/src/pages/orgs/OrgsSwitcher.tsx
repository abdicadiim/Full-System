import React from 'react'
import Card from '../../components/ui/Card'
import { useOrgs } from '../../state/orgsContext'

export default function OrgsSwitcher(){
  const { orgs, activeOrg, setActive } = useOrgs()
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Organizations</h2>
      <Card className="p-5 text-[13px] space-y-3">
        <div>Active Org: <span className="font-medium">{activeOrg?.name ?? 'None'}</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orgs.map(o => (
            <button key={o.id} onClick={()=>setActive(o.id)}
              className={`rounded-lg border px-3 py-2 text-left ${activeOrg?.id===o.id?'border-brand text-brand bg-brand/5':'border-slate-200 hover:bg-slate-50'}`}>
              {o.name}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
