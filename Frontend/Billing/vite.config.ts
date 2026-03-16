import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
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
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    // Suppress 404 errors for missing favicon
    fs: {
      strict: false,
    },
  },
  // Suppress console warnings for missing assets
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress favicon warnings
        if (warning.code === 'UNRESOLVED_IMPORT' || warning.message.includes('favicon')) return
        warn(warning)
      },
    },
  },
})
