import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_BACKEND_ORIGIN = 'http://127.0.0.1:5000'

const resolveBackendOrigin = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return DEFAULT_BACKEND_ORIGIN

  try {
    return new URL(raw, DEFAULT_BACKEND_ORIGIN).origin
  } catch {
    return DEFAULT_BACKEND_ORIGIN
  }
}
const manualChunks = (id) => {
  const normalizedId = id.replace(/\\/g, '/').toLowerCase()

  if (normalizedId.includes('/node_modules/')) {
    if (
      normalizedId.includes('/react/') ||
      normalizedId.includes('/react-dom/') ||
      normalizedId.includes('/react-router/') ||
      normalizedId.includes('/react-router-dom/')
    ) {
      return 'react-vendor'
    }
    if (normalizedId.includes('/lucide-react/')) {
      return 'icons-vendor'
    }
    if (normalizedId.includes('/xlsx/')) {
      return 'sheet-vendor'
    }
    if (normalizedId.includes('/jspdf/') || normalizedId.includes('/html2canvas/')) {
      return 'pdf-vendor'
    }
    if (normalizedId.includes('/react-toastify/') || normalizedId.includes('/dompurify/')) {
      return 'ui-vendor'
    }
  }

  return undefined
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendOrigin = resolveBackendOrigin(env.VITE_API_ORIGIN || env.VITE_API_URL)

  return {
    // base: './',
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
      // Suppress 404 errors for missing favicon
      fs: {
        strict: false
      }
    },
    // Suppress console warnings for missing assets
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
        onwarn(warning, warn) {
          // Suppress favicon warnings
          if (warning.code === 'UNRESOLVED_IMPORT' || warning.message.includes('favicon')) return;
          warn(warning);
        }
      }
    }
  }
})
