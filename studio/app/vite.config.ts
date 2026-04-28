import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  plugins: [react()],
  server: {
    host: process.env['STUDIO_HOST'] ?? '0.0.0.0',
    port: 4319,
    proxy: {
      '/api': 'http://127.0.0.1:4318',
    },
  },
  build: {
    outDir: '../../dist/studio',
    emptyOutDir: true,
  },
})
