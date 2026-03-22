import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  root: 'src',

  // public/ en la raíz del proyecto (no dentro de src/)
  // Vite copia todo public/ al dist/ sin procesar
  // → sw.js queda en dist/sw.js → sirve como /sw.js ✅
  // → icons/ queda en dist/icons/ → sirve como /icons/ ✅ (sin doble /assets/)
  publicDir: resolve(__dirname, 'public'),

  plugins: [
    tailwindcss(),
  ],

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'src/index.html'),
        admin: resolve(__dirname, 'src/admin.html'),
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  },
})
