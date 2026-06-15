import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000'

const proxy = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 3002,
    strictPort: true,
    allowedHosts: true,

    // Para Google Cloud Workstations:
    // evita websocket/HMR inestable que puede provocar recargas completas.
    hmr: false,

    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '../api/**',
        '../api/uploads/**',
        '../api/node_modules/**',
      ],
    },

    proxy,
  },

  // Modo estable: usar build + preview.
  // Preview no inyecta @vite/client ni websocket de HMR.
  preview: {
    host: '0.0.0.0',
    port: 3002,
    strictPort: true,
    allowedHosts: true,
    proxy,
  },
})
