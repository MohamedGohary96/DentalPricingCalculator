<script setup>
import { useI18nStore } from '@/stores/i18n.js'
import DpcIcon from './DpcIcon.vue'

defineProps({
  theme: { type: String, default: 'light' }, // light | dark
})

const i18n = useI18nStore()
</script>

<template>
  <button :class="['lang-btn', theme === 'dark' && 'is-dark']" @click="i18n.toggleLocale()">
    <DpcIcon name="Globe" :size="14" :stroke-width="1.6" />
    <span>{{ i18n.locale === 'en' ? 'العربية' : 'English' }}</span>
  </button>
</template>

<style scoped>
.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(15,37,69,.04);
  box-shadow: inset 0 0 0 1px rgba(15,37,69,.08);
  color: var(--ink-700);
  cursor: pointer;
  transition: background .15s;
}
.lang-btn.is-dark {
  background: rgba(255,255,255,.08);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.14);
  color: rgba(255,255,255,.85);
}
.lang-btn:hover { opacity: .85; }
</style>
