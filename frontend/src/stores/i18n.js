import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useI18nStore = defineStore('i18n', () => {
  const savedLocale = localStorage.getItem('dpc_locale') || 'en'
  const locale = ref(savedLocale)
  const messages = ref({})

  const dir = computed(() => locale.value === 'ar' ? 'rtl' : 'ltr')

  async function loadTranslations(lang) {
    try {
      const res = await fetch(`/static/translations/${lang}.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      messages.value = await res.json()
      locale.value = lang
      localStorage.setItem('dpc_locale', lang)
      document.documentElement.dir  = dir.value
      document.documentElement.lang = lang
    } catch (e) {
      console.warn('[i18n] Failed to load', lang, e)
    }
  }

  function t(key) {
    const parts = key.split('.')
    let cur = messages.value
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return key
      cur = cur[p]
    }
    return typeof cur === 'string' ? cur : key
  }

  async function toggleLocale() {
    const next = locale.value === 'en' ? 'ar' : 'en'
    await loadTranslations(next)
  }

  return { locale, messages, dir, t, loadTranslations, toggleLocale }
})
