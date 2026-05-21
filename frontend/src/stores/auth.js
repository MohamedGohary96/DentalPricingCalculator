import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const api = axios.create({ withCredentials: true })

export const useAuthStore = defineStore('auth', () => {
  const user         = ref(null)
  const subscription = ref(null)
  const loading      = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  async function fetchUser() {
    loading.value = true
    try {
      const { data } = await api.get('/api/user')
      user.value = data
      // Subscription comes from the user endpoint or a separate call
      subscription.value = data.subscription || null
      if (!subscription.value) {
        const sub = await api.get('/api/subscription').catch(() => ({ data: null }))
        subscription.value = sub.data
      }
    } finally {
      loading.value = false
    }
  }

  async function login(username, password) {
    const { data } = await api.post('/login', { username, password })
    if (data.success) {
      user.value = data.user
    } else {
      throw new Error(data.error || 'Login failed')
    }
  }

  async function logout() {
    await api.get('/logout').catch(() => {})
    user.value         = null
    subscription.value = null
  }

  async function register(payload) {
    const { data } = await api.post('/api/register', payload)
    return data
  }

  return { user, subscription, loading, isLoggedIn, fetchUser, login, logout, register }
})
