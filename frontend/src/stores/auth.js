import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const api = axios.create({ withCredentials: true })

export const useAuthStore = defineStore('auth', () => {
  const user         = ref(null)
  const subscription = ref(null)
  const loading      = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const isTrial = computed(() => {
    // Return false if no subscription data yet (prevents flickering)
    if (!subscription.value) return false
    return subscription.value.restriction_level === 'trial'
  })

  async function fetchUser() {
    loading.value = true
    try {
      const { data } = await api.get('/api/user')
      user.value = data
      // Subscription always comes from the /api/user response
      subscription.value = data.subscription || null
    } finally {
      loading.value = false
    }
  }

  async function login(username, password, remember = false) {
    const { data } = await api.post('/login', { username, password, remember })
    if (data.success) {
      user.value = data.user
      // Extract subscription from user object (login returns it nested)
      subscription.value = data.user.subscription || null
    } else {
      throw new Error(data.error || 'Login failed')
    }
  }

  async function logout() {
    await api.get('/logout').catch(() => {})
    user.value         = null
    subscription.value = null

    // Clear all store data
    const { useClinicStore } = await import('./clinic.js')
    const { usePricingStore } = await import('./pricing.js')
    const clinic = useClinicStore()
    const pricing = usePricingStore()
    clinic.reset()
    pricing.reset()
  }

  async function register(payload) {
    const { data } = await api.post('/api/register', payload)
    return data
  }

  return { user, subscription, loading, isLoggedIn, isTrial, fetchUser, login, logout, register }
})
