<script setup>
import { useI18nStore } from '@/stores/i18n.js'

defineProps({
  value:    { type: Number, default: 0 },
  currency: { type: String, default: '' },
  big:      { type: Boolean, default: false },
})

const i18n = useI18nStore()

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const numLocale = i18n.locale === 'ar' ? 'ar-EG' : 'en-US'
  return new Intl.NumberFormat(numLocale, { maximumFractionDigits: 0 }).format(Math.round(n))
}
</script>

<template>
  <span class="dpc-num" :style="{ fontWeight: big ? 600 : 500 }">
    {{ fmt(value) }}<span v-if="currency" class="dpc-currency">{{ currency }}</span>
  </span>
</template>

<style scoped>
.dpc-currency {
  font-family: var(--font-sans);
  font-size: 0.6em;
  font-weight: 500;
  color: var(--ink-500);
  margin-inline-start: 0.3em;
  vertical-align: 0.25em;
  letter-spacing: 0.04em;
}
</style>
