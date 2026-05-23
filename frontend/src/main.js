import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/tokens.css'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Lazy import stores after pinia is registered
async function boot() {
  const { useI18nStore } = await import('./stores/i18n.js')
  const { useAuthStore } = await import('./stores/auth.js')

  const i18n = useI18nStore()
  const auth = useAuthStore()

  const savedLocale = localStorage.getItem('dpc_locale') || 'en'

  // Load translations and user data in parallel
  await Promise.all([
    i18n.loadTranslations(savedLocale),
    auth.fetchUser().catch(() => {})
  ])

  // Mount app only after auth data is ready
  app.mount('#app')
}

boot()
