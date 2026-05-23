import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
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
