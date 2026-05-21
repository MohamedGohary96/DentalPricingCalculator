<script setup>
/**
 * DpcLastReview — shows when the user last visited the price list.
 * Reads localStorage key 'dpc_last_price_review'.
 * Clickable → navigates to /results/price-list.
 */
import { computed } from 'vue'
import { useRouter }    from 'vue-router'
import { useI18nStore } from '@/stores/i18n.js'
import DpcIcon from './DpcIcon.vue'

const router = useRouter()
const i18n   = useI18nStore()
const isAr   = computed(() => i18n.locale === 'ar')

const daysSince = computed(() => {
  const raw = localStorage.getItem('dpc_last_price_review')
  if (!raw) return null
  const then = new Date(raw)
  const now  = new Date()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
})

const color = computed(() => {
  if (daysSince.value === null) return 'var(--ink-400)'
  if (daysSince.value < 30)    return 'var(--ink-500)'
  if (daysSince.value < 60)    return 'var(--warning-600)'
  return 'var(--danger-600)'
})

const label = computed(() => {
  if (daysSince.value === null) {
    return isAr.value ? 'لم تتم مراجعة الأسعار بعد' : 'No price review yet'
  }
  if (daysSince.value === 0) {
    return isAr.value ? 'آخر مراجعة: اليوم' : 'Last reviewed: today'
  }
  if (isAr.value) {
    return `آخر مراجعة: منذ ${daysSince.value} ${daysSince.value === 1 ? 'يوم' : 'أيام'}`
  }
  return `Last reviewed: ${daysSince.value} ${daysSince.value === 1 ? 'day' : 'days'} ago`
})
</script>

<template>
  <button class="lr-root" :style="{ color }" @click="router.push('/results/price-list')">
    <DpcIcon name="Clock" :size="13" :stroke-width="1.8" class="lr-icon" />
    <span class="lr-label">{{ label }}</span>
    <DpcIcon
      :name="i18n.dir === 'rtl' ? 'ChevronLeft' : 'ChevronRight'"
      :size="12"
      :stroke-width="2"
      class="lr-arrow"
    />
  </button>
</template>

<style scoped>
.lr-root {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 9px 12px;
  border-radius: var(--r);
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.12s, box-shadow 0.12s;
  text-align: start;
}

.lr-root:hover {
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--ink-300);
}

.lr-icon { flex: none; }

.lr-label { flex: 1; min-width: 0; }

.lr-arrow {
  flex: none;
  color: var(--ink-300);
  opacity: 0.7;
}
</style>
