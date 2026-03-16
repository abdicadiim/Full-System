import React, { useMemo, useState } from 'react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { db } from '../../store/db'

function TaxForm({ initial, onSubmit, onCancel }){
  const [v,setV] = useState(initial || { id: db.taxes.uid('tax'), name:'', rate:0, region:'', mode:'exclusive', active:true })
  function set(k,val){ setV(o=>({...o,[k]:val})) }
  function submit(){
    if(!v.name.trim()) return alert('Name required')
    if(v.rate<0) return alert('Rate must be >=0')
    onSubmit?.(v)
  }
  return (
    <div className="space-y-3 text-[13px]">
      <div className="grid grid-cols-2 gap-3">
        <div><div className="text-[12px] text-slate-500">Name</div><input value={v.name} onChange={e=>set('name',e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></div>
        <div><div className="text-[12px] text-slate-500">Region</div><input value={v.region} onChange={e=>set('region',e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><div className="text-[12px] text-slate-500">Rate (%)</div><input type="number" value={v.rate} onChange={e=>set('rate', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></div>
        <div><div className="text-[12px] text-slate-500">Mode</div><select value={v.mode} onChange={e=>set('mode', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="exclusive">Exclusive</option><option value="inclusive">Inclusive</option></select></div>
        <div><div className="text-[12px] text-slate-500">Status</div><select value={v.active?'active':'inactive'} onChange={e=>set('active', e.target.value==='active')} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-2">Cancel</button>
        <button onClick={submit} className="rounded-lg bg-brand px-3 py-2 text-white">Save</button>
      </div>
    </div>
  )
}

export default function TaxesList(){
  const [editing,setEditing] = useState(null)
  const [showNew,setShowNew] = useState(false)
  const [tick,setTick] = useState(0)
  const list = useMemo(()=> db.taxes.list(), [tick])

  function create(v){ db.taxes.add(v); setShowNew(false); setTick(t=>t+1) }
  function update(v){ db.taxes.update(v.id, v); setEditing(null); setTick(t=>t+1) }
  function remove(id){ db.taxes.remove(id); setTick(t=>t+1) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Taxes</h2>
          <p className="text-[13px] text-slate-500">Inclusive/Exclusive with regions</p>
        </div>
        <button onClick={()=>setShowNew(true)} className="rounded-lg bg-brand px-3 py-2 text-white text-[13px]">New Tax</button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="min-w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Rate</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(t => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2">{t.rate}%</td>
                <td className="px-3 py-2 capitalize">{t.mode}</td>
                <td className="px-3 py-2">{t.region||'—'}</td>
                <td className="px-3 py-2">{t.active ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge>}</td>
                <td className="px-3 py-2 space-x-2">
                  <button onClick={()=>setEditing(t)} className="text-brand">Edit</button>
                  <button onClick={()=>remove(t.id)} className="text-rose-600">Delete</button>
                </td>
              </tr>
            ))}
            {list.length===0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No taxes</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={showNew} onClose={()=>setShowNew(false)} title="New Tax">
        <TaxForm onSubmit={create} onCancel={()=>setShowNew(false)} />
      </Modal>
      <Modal open={!!editing} onClose={()=>setEditing(null)} title={`Edit Tax: ${editing?.name||''}`}>
        {editing && <TaxForm initial={editing} onSubmit={update} onCancel={()=>setEditing(null)} />}
      </Modal>
    </div>
  )
}

