import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const api = axios.create({ withCredentials: true })

export const usePricingStore = defineStore('pricing', () => {
  const services          = ref([])
  const priceList         = ref([])
  const priceListLoaded   = ref(false)
  const chairCostPerHour  = ref(0)
  const setupStatus       = ref(null)
  const dashboardStats    = ref(null)

  async function loadServices() {
    const { data } = await api.get('/api/services')
    services.value = data
  }

  async function createService(payload) {
    const { data } = await api.post('/api/services', payload)
    services.value.push(data)
    return data
  }

  async function updateService(id, payload) {
    await api.put(`/api/services/${id}`, payload)
    const { consumables, materials, equipment_list, ...fields } = payload
    const idx = services.value.findIndex(s => s.id === id)
    if (idx >= 0) services.value[idx] = { ...services.value[idx], ...fields }
  }

  async function deleteService(id) {
    await api.delete(`/api/services/${id}`)
    services.value = services.value.filter(s => s.id !== id)
  }

  async function loadPriceList() {
    const { data } = await api.get('/api/price-list')
    priceList.value = data
    priceListLoaded.value = true
  }

  async function computeCalc(payload) {
    const { data } = await api.post('/api/calculator/compute', payload)
    if (data.chair_cost_per_hour != null) {
      chairCostPerHour.value = data.chair_cost_per_hour
    }
    return data
  }

  async function loadSetupStatus() {
    const { data } = await api.get('/api/setup-status')
    setupStatus.value = data
    if (data.chair_cost_per_hour != null) {
      chairCostPerHour.value = data.chair_cost_per_hour
    }
    return data
  }

  async function loadDashboardStats() {
    const { data } = await api.get('/api/dashboard/stats')
    dashboardStats.value = data
    return data
  }

  async function completeOnboarding() {
    const { data } = await api.post('/api/onboarding/complete', {})
    return data
  }

  // Reset all pricing data (call on logout)
  function reset() {
    services.value = []
    priceList.value = []
    priceListLoaded.value = false
    chairCostPerHour.value = 0
    setupStatus.value = null
    dashboardStats.value = null
  }

  return {
    services, priceList, priceListLoaded, chairCostPerHour, setupStatus, dashboardStats,
    loadServices, createService, updateService, deleteService,
    loadPriceList, computeCalc, loadSetupStatus, loadDashboardStats,
    completeOnboarding, reset,
  }
})
