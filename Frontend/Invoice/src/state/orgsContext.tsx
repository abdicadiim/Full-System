import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { db } from '../store/db'

const OrgsCtx = createContext(null)
export function OrgsProvider({ children }){
  const [orgs, setOrgs] = useState([])
  const [activeId, setActiveId] = useState(null)

  useEffect(()=>{
    const all = db.orgs.list()
    setOrgs(all)
    if(!activeId){
      const last = localStorage.getItem('active_org_id')
      setActiveId(last || (all[0]?.id ?? null))
    }
  },[])

  const activeOrg = useMemo(()=> orgs.find(o=>o.id===activeId) || null, [orgs, activeId])

  const value = useMemo(()=>({ orgs, activeOrg, setActive: (id)=>{
    setActiveId(id)
    localStorage.setItem('active_org_id', id)
  }}), [orgs, activeOrg])

  return <OrgsCtx.Provider value={value}>{children}</OrgsCtx.Provider>
}

export function useOrgs(){ return useContext(OrgsCtx) }

