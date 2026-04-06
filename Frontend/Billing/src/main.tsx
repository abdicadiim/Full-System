import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { BillingQueryProvider } from './lib/query/BillingQueryProvider'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'

const RootWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode

createRoot(document.getElementById('root')).render(
  <RootWrapper>
    <BillingQueryProvider>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true
        }}
      >
        <App />
      </BrowserRouter>
    </BillingQueryProvider>
  </RootWrapper>
)
