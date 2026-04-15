import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AppRoutes from './routes/AppRoutes'
import { UserProvider } from './lib/auth/UserContext'
import AuthGate from './lib/auth/AuthGate'
import { ThemeProvider } from './lib/theme/ThemeProvider'
import { SettingsProvider } from './lib/settings/SettingsContext'
import { ToastContainer } from 'react-toastify'
import { Toaster } from 'react-hot-toast'

export default function App() {
  const location = useLocation()
  const isPublicSenderVerification = location.pathname.startsWith('/sender-verification')

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reloadKey = `invoice_chunk_reload:${location.pathname}`;

    const shouldReloadForError = (message: string) => {
      if (!message) return false;
      return (
        message.includes("Loading chunk") ||
        message.includes("failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed")
      );
    };

    const handleError = (event: ErrorEvent) => {
      if (!shouldReloadForError(event.message || "")) return;
      if (sessionStorage.getItem(reloadKey) === "1") return;
      sessionStorage.setItem(reloadKey, "1");
      window.location.reload();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason as any;
      const message = String(reason?.message || reason || "");
      if (!shouldReloadForError(message)) return;
      if (sessionStorage.getItem(reloadKey) === "1") return;
      sessionStorage.setItem(reloadKey, "1");
      window.location.reload();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [location.pathname]);

  return (
    <UserProvider>
      <ThemeProvider>
        <SettingsProvider>
          {isPublicSenderVerification ? (
            <AppRoutes />
          ) : (
            <Layout>
              <AuthGate>
                <AppRoutes />
              </AuthGate>
            </Layout>
          )}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
          />
          <Toaster position="top-right" />
        </SettingsProvider>
      </ThemeProvider>
    </UserProvider>
  )
}

