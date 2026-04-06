import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './lib/queryClient'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'

if (import.meta.env.PROD && !window.location.pathname.startsWith("/sender-verification")) {
  const schedulePreload = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        import("./routes/preloadInvoiceRoutes").then(({ preloadInvoiceRoutes }) => preloadInvoiceRoutes())
      }, { timeout: 3000 })
    } else {
      window.setTimeout(() => {
        import("./routes/preloadInvoiceRoutes").then(({ preloadInvoiceRoutes }) => preloadInvoiceRoutes())
      }, 1200)
    }
  }

  if (document.readyState === "complete") {
    schedulePreload()
  } else {
    window.addEventListener("load", schedulePreload, { once: true })
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true
        }}
      >
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
