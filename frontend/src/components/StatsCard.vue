<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  unit: { type: String, default: '' },
  icon: { type: String, default: 'TrendingUp' },
  trend: { type: Number, default: null }, // Percentage change
  trendLabel: { type: String, default: '' },
  variant: { type: String, default: 'default', validator: v => ['default', 'success', 'warning', 'danger', 'info'].includes(v) },
  loading: { type: Boolean, default: false },
  animate: { type: Boolean, default: true }
})

const displayValue = ref(0)
const mounted = ref(false)

// Animate number counting on mount
onMounted(() => {
  mounted.value = true
  // Don't animate if loading or value is 0
  if (!props.loading && props.animate && typeof props.value === 'number' && props.value !== 0) {
    animateValue(0, props.value, 800)
  } else {
    displayValue.value = props.value
  }
})

// Watch for value changes
watch(() => props.value, (newVal, oldVal) => {
  if (props.loading) return // Don't update while loading
  if (mounted.value && props.animate && typeof newVal === 'number' && typeof oldVal === 'number') {
    animateValue(oldVal, newVal, 500)
  } else {
    displayValue.value = newVal
  }
})

// Watch for loading state change
watch(() => props.loading, (isLoading, wasLoading) => {
  // When loading changes from true to false, animate to the actual value
  if (wasLoading && !isLoading && props.animate && typeof props.value === 'number' && props.value !== 0) {
    animateValue(0, props.value, 800)
  } else if (!isLoading) {
    displayValue.value = props.value
  }
})

function animateValue(start, end, duration) {
  const range = end - start
  const increment = range / (duration / 16) // 60fps
  let current = start

  const timer = setInterval(() => {
    current += increment
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end
      clearInterval(timer)
    }
    displayValue.value = Math.round(current)
  }, 16)
}

const variantConfig = computed(() => {
  const configs = {
    default:  { iconBg: 'var(--teal-50)',    iconColor: 'var(--teal-700)',    iconBorder: 'var(--teal-100)' },
    success:  { iconBg: 'var(--success-50)', iconColor: 'var(--success-700)', iconBorder: 'var(--success-100)' },
    warning:  { iconBg: 'var(--warning-50)', iconColor: 'var(--warning-700)', iconBorder: 'var(--warning-100)' },
    danger:   { iconBg: 'var(--danger-50)',  iconColor: 'var(--danger-700)',  iconBorder: 'var(--danger-100)' },
    info:     { iconBg: 'rgba(14,165,233,.08)', iconColor: '#0284c7',         iconBorder: 'rgba(14,165,233,.15)' },
  }
  return configs[props.variant] || configs.default
})

const trendConfig = computed(() => {
  if (props.trend === null || props.trend === undefined) return null
  const isPositive = props.trend > 0
  return {
    icon: isPositive ? 'TrendingUp' : 'TrendingDown',
    color: isPositive ? 'var(--success-600)' : 'var(--danger-600)',
    text: `${isPositive ? '+' : ''}${props.trend}%`
  }
})

const formattedValue = computed(() => {
  if (typeof displayValue.value === 'number') {
    return displayValue.value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  return displayValue.value
})
</script>

<template>
  <div class="stats-card hover-lift">
    <div class="stats-top">
      <span class="stats-label">{{ label }}</span>
      <div class="stats-icon" :style="{
        background: variantConfig.iconBg,
        color: variantConfig.iconColor,
        boxShadow: `inset 0 0 0 1px ${variantConfig.iconBorder}`
      }">
        <DpcIcon :name="icon" :size="14" :stroke-width="1.8" />
      </div>
    </div>

    <div class="stats-bottom">
      <div v-if="loading" class="shimmer stats-value-skeleton" />
      <div v-else class="stats-value-wrapper">
        <span class="stats-value dpc-num">{{ formattedValue }}</span>
        <span v-if="unit" class="stats-unit">{{ unit }}</span>
      </div>

      <!-- Trend indicator -->
      <div v-if="trendConfig && !loading" class="stats-trend" :style="{ color: trendConfig.color }">
        <DpcIcon :name="trendConfig.icon" :size="12" :stroke-width="2" />
        <span>{{ trendConfig.text }}</span>
        <span v-if="trendLabel" class="trend-label">{{ trendLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-xs);
}

.stats-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.stats-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.stats-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  transition: all var(--duration-fast);
}

.stats-card:hover .stats-icon {
  transform: rotate(5deg) scale(1.05);
}

.stats-bottom {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-value-wrapper {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stats-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--ink-900);
  letter-spacing: -0.02em;
}

.stats-unit {
  font-size: 14px;
  color: var(--ink-500);
  font-weight: 500;
}

.stats-value-skeleton {
  height: 32px;
  width: 120px;
  border-radius: var(--radius-sm);
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 600;
}

.trend-label {
  margin-inline-start: 4px;
  color: var(--ink-500);
  font-weight: 500;
}

/* Sparkline placeholder */
.stats-card.with-sparkline .stats-bottom {
  gap: 12px;
}
</style>
