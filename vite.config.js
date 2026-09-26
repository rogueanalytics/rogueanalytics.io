import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom domain (rogueanalytics.io) serves from the root, so base stays '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
