import React from 'react'
import { Routes, Route } from 'react-router-dom'
import TaxesList from './TaxesList'
export default function TaxesRoutes(){ return (<Routes><Route index element={<TaxesList/>}/></Routes>) }
