import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { OrgsProvider } from '../../state/orgsContext'
import { transactionNumberSeriesAPI } from '../../services/api'

export default function Layout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEmbeddedPage = searchParams.get("embed") === "1" || searchParams.get("quickAction") === "1";
  const hideAppChrome =
    isEmbeddedPage ||
    location.pathname.startsWith("/documents") ||
    location.pathname.startsWith("/products/checkout-button") ||
    location.pathname.startsWith("/products/pricing-widgets/new");
  const isFullWidthPage =
    location.pathname === "/expenses" ||
    location.pathname === "/expenses/receipts" ||
    location.pathname === "/expenses/recurring-expenses" ||
    location.pathname.startsWith("/sales/credit-notes") ||
    location.pathname.startsWith("/credit-notes") ||
    location.pathname.startsWith("/sales/sales-receipts") ||
    location.pathname.startsWith("/sales/customers") ||
    location.pathname.startsWith("/sales/quotes") ||
    location.pathname.startsWith("/sales/retainer-invoices") ||
    location.pathname.startsWith("/sales/invoices") ||
    location.pathname.startsWith("/sales/recurring-invoices") ||
    location.pathname.startsWith("/time-tracking") ||
    location.pathname.startsWith("/products/plans") ||
    location.pathname.startsWith("/products/products") ||
    location.pathname.startsWith("/products/coupons") ||
    location.pathname.startsWith("/products/addons") ||
    location.pathname.startsWith("/products/pricing-widgets") ||
    location.pathname.startsWith("/products/price-lists") ||
    location.pathname.startsWith("/items") ||
    location.pathname.startsWith("/products/items") ||
    location.pathname.startsWith("/reports");
  const isCreditNotesDetailPage =
    (location.pathname.startsWith("/sales/credit-notes/") || location.pathname.startsWith("/credit-notes/")) &&
    ![
      "/sales/credit-notes/new",
      "/sales/credit-notes/import",
      "/sales/credit-notes/import-applied",
      "/sales/credit-notes/import-refunds",
      "/sales/credit-notes/custom-view/new",
      "/credit-notes/new",
      "/credit-notes/import",
      "/credit-notes/import-applied",
      "/credit-notes/import-refunds",
      "/credit-notes/custom-view/new"
    ].includes(location.pathname);
  const disablePageScroll = isCreditNotesDetailPage;

  useEffect(() => {
    transactionNumberSeriesAPI.getAll({ limit: 10000 }).catch(() => null);
  }, []);

  if (hideAppChrome) {
    return (
      <OrgsProvider>
        <div className="min-h-screen w-full bg-white text-[rgb(21,99,114)]">
          <main className="w-full min-w-0">{children}</main>
        </div>
      </OrgsProvider>
    );
  }

  return (
    <OrgsProvider>
      <div className="h-screen w-full bg-slate-50 text-[rgb(21,99,114)] overflow-hidden">
        <div className="flex h-full">
          <Sidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />
          <div className={`flex-1 min-w-0 h-full flex flex-col bg-white overflow-hidden ${sidebarCollapsed ? "lg:ml-[112px]" : "lg:ml-[236px]"}`}>
            <Header onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

            {/* Mobile Action Bar - "Under the header" */}
            <div className="lg:hidden sticky top-16 z-30 flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 active:scale-95 transition-all"
                aria-label="Toggle sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation Menu</div>
            </div>

            <main
              className={`w-full min-w-0 flex-1 min-h-0 ${disablePageScroll ? "overflow-hidden" : "overflow-y-auto"} ${
                isFullWidthPage ? "p-0" : "p-4 md:p-6"
              }`}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </OrgsProvider>
  )
}
