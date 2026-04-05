import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Use root path in dev so http://localhost:5173/ works; keep subpath for production (e.g. GitHub Pages).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/restroom-queue-simulator/',
}))
