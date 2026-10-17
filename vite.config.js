import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // base: '/SiEsteros/',  // Descomentar para deploy en GitHub Pages
  server: {
    port: 5174,
    strictPort: false, // Si 5174 está ocupado, usa el siguiente disponible
  },
})