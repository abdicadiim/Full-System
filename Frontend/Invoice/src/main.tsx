import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { InvoiceQueryProvider } from './lib/query/InvoiceQueryProvider'
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
    <InvoiceQueryProvider>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <App />
      </BrowserRouter>
    </InvoiceQueryProvider>
  </React.StrictMode>
)
