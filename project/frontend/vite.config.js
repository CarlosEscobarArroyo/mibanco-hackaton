import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend compilado a /dist; FastAPI lo sirve desde "/".
// En dev, proxy de /api al backend en :8080.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
