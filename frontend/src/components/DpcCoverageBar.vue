<script setup>
/**
 * DpcCoverageBar — shows services configured progress + warning pills.
 * Emits 'filter' with { type: 'underpriced'|'missing_consumables'|null }
 * so ServicesView can filter the table.
 */
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  totalServices:       { type: Number, default: 0 },
  pricedServices:      { type: Number, default: 0 },
  underpricedServices: { type: Number, default: 0 },
  missingConsumables:  { type: Number, default: 0 },
})

const emit = defineEmits(['filter'])

const i18n = useI18nStore()
const isAr = computed(() => i18n.locale === 'ar')

const pct = computed(() => {
  if (!props.totalServices) return 0
  return Math.round((props.pricedServices / props.totalServices) * 100)
})

// Color: red if underpriced, amber if missing consumables, green if all clear
const barColor = computed(() => {
  if (props.underpricedServices > 0) return 'var(--danger-600)'
  if (props.missingConsumables  > 0) return 'var(--warning-600)'
  if (props.pricedServices > 0)      return 'var(--success-600)'
  return 'var(--ink-300)'
})

const barBg = computed(() => {
  if (props.underpricedServices > 0) return 'var(--danger-50)'
  if (props.missingConsumables  > 0) return 'var(--warning-50)'
  return 'var(--teal-50)'
})

function filterBy(type) {
  emit('filter', { type })
}
</script>

<template>
  <div class="cvg-root">
    <!-- Summary text -->
    <div class="cvg-summary">
      <span class="cvg-main-text">
        <template v-if="isAr">
          أضفت <strong>{{ pricedServices }}</strong> من أصل <strong>{{ totalServices }}</strong> خدمة
        </template>
        <template v-else>
          Configured <strong>{{ pricedServices }}</strong> of <strong>{{ totalServices }}</strong> services
        </template>
      </span>
      <span class="cvg-pct dpc-num" :style="{ color: barColor }">{{ pct }}%</span>
    </div>

    <!-- Progress bar -->
    <div class="cvg-track">
      <div
        class="cvg-fill"
        :style="{
          width: pct + '%',
          background: barColor,
        }"
      />
    </div>

    <!-- Warning pills — clickable to filter table -->
    <div v-if="underpricedServices > 0 || missingConsumables > 0" class="cvg-warnings">
      <button
        v-if="underpricedServices > 0"
        class="cvg-pill cvg-pill-danger"
        @click="filterBy('underpriced')"
        :title="isAr ? 'اضغط لتصفية الخدمات ذات السعر المنخفض' : 'Click to filter underpriced services'"
      >
        <DpcIcon name="AlertTriangle" :size="12" :stroke-width="2" />
        {{ underpricedServices }}
        {{ isAr ? (underpricedServices === 1 ? 'خدمة بسعر منخفض' : 'خدمات بسعر منخفض') : (underpricedServices === 1 ? 'underpriced' : 'underpriced') }}
      </button>

      <button
        v-if="missingConsumables > 0"
        class="cvg-pill cvg-pill-warning"
        @click="filterBy('missing_consumables')"
        :title="isAr ? 'اضغط لتصفية الخدمات الناقصة خامات' : 'Click to filter services missing consumables'"
      >
        <DpcIcon name="Package" :size="12" :stroke-width="2" />
        {{ missingConsumables }}
        {{ isAr ? (missingConsumables === 1 ? 'خدمة ناقصة خامات' : 'خدمات ناقصة خامات') : (missingConsumables === 1 ? 'missing consumables' : 'missing consumables') }}
      </button>

      <button
        v-if="underpricedServices > 0 || missingConsumables > 0"
        class="cvg-pill cvg-pill-clear"
        @click="filterBy(null)"
      >
        {{ isAr ? 'عرض الكل' : 'Show all' }}
      </button>
    </div>

    <!-- All-good state -->
    <div v-else-if="pricedServices > 0 && pricedServices >= totalServices" class="cvg-all-good">
      <DpcIcon name="CheckCircle" :size="13" :stroke-width="2" />
      {{ isAr ? 'جميع الخدمات مكتملة' : 'All services configured' }}
    </div>
  </div>
</template>

<style scoped>
.cvg-root {
  padding: 14px 16px;
  background: var(--paper);
  border-radius: var(--r);
  box-shadow: inset 0 0 0 1px var(--line);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cvg-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cvg-main-text {
  font-size: 13px;
  color: var(--ink-700);
}

.cvg-pct {
  font-size: 13px;
  font-weight: 700;
}

/* Track + fill */
.cvg-track {
  height: 7px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.cvg-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
  min-width: 3px;
}

/* Warning pills */
.cvg-warnings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.cvg-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.12s, transform 0.12s;
}

.cvg-pill:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.cvg-pill:active {
  transform: translateY(0);
}

.cvg-pill-danger {
  background: var(--danger-50);
  color: var(--danger-700);
  box-shadow: inset 0 0 0 1px var(--danger-200);
}

.cvg-pill-warning {
  background: var(--warning-50);
  color: var(--warning-700);
  box-shadow: inset 0 0 0 1px var(--warning-200);
}

.cvg-pill-clear {
  background: var(--paper-2);
  color: var(--ink-600);
  box-shadow: inset 0 0 0 1px var(--line);
}

/* All good */
.cvg-all-good {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--success-600);
}

/* RTL */
[dir="rtl"] .cvg-summary { flex-direction: row-reverse; }
[dir="rtl"] .cvg-warnings { flex-direction: row-reverse; }
</style>
