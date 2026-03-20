import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist'
  },
  base: '/Empresa-Limpieza-RR/',

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