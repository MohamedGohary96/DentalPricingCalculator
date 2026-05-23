import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api':                 'http://localhost:5002',
      '/login':               'http://localhost:5002',
      '/logout':              'http://localhost:5002',
      '/register':            'http://localhost:5002',
      '/static/translations': 'http://localhost:5002',
    },
  },
})
