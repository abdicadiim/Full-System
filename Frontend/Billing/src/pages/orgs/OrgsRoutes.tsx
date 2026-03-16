import React from 'react'
import { Routes, Route } from 'react-router-dom'
import OrgsSwitcher from './OrgsSwitcher'
export default function OrgsRoutes(){ return (<Routes><Route index element={<OrgsSwitcher/>}/></Routes>) }
