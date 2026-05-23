<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, required: true, validator: v => v >= 0 && v <= 100 },
  size: { type: Number, default: 120 },
  strokeWidth: { type: Number, default: 8 },
  showLabel: { type: Boolean, default: true },
  label: { type: String, default: '' },
  animate: { type: Boolean, default: true },
  variant: { type: String, default: 'auto', validator: v => ['auto', 'success', 'warning', 'danger', 'info'].includes(v) }
})

const displayValue = ref(0)
const mounted = ref(false)

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => {
  const progress = displayValue.value / 100
  return circumference.value * (1 - progress)
})

const colorVariant = computed(() => {
  if (props.variant !== 'auto') return props.variant

  // Auto color based on value
  if (displayValue.value >= 80) return 'success'
  if (displayValue.value >= 60) return 'info'
  if (displayValue.value >= 40) return 'warning'
  return 'danger'
})

const strokeColor = computed(() => {
  const colors = {
    success: 'var(--success-600)',
    info: 'var(--teal-600)',
    warning: 'var(--warning-600)',
    danger: 'var(--danger-600)'
  }
  return colors[colorVariant.value] || colors.info
})

const gradientId = computed(() => `gradient-${Math.random().toString(36).substr(2, 9)}`)

onMounted(() => {
  mounted.value = true
  if (props.animate) {
    animateValue(0, props.value, 1000)
  } else {
    displayValue.value = props.value
  }
})

watch(() => props.value, (newVal, oldVal) => {
  if (mounted.value && props.animate) {
    animateValue(oldVal, newVal, 600)
  } else {
    displayValue.value = newVal
  }
})

function animateValue(start, end, duration) {
  const range = end - start
  const increment = range / (duration / 16)
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
</script>

<template>
  <div class="progress-ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="ring-svg">
      <!-- Background circle -->
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        class="ring-bg"
      />

      <!-- Progress circle with gradient -->
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: strokeColor }" />
          <stop offset="100%" :style="{ stopColor: strokeColor, stopOpacity: 0.7 }" />
        </linearGradient>
      </defs>

      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="`url(#${gradientId})`"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="ring-progress"
        stroke-linecap="round"
      />
    </svg>

    <!-- Center content -->
    <div class="ring-content">
      <slot>
        <div class="ring-value">{{ Math.round(displayValue) }}</div>
        <div v-if="showLabel || label" class="ring-label">{{ label || '%' }}</div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.progress-ring {
  position: relative;
  display: inline-block;
}

.ring-svg {
  transform: rotate(-90deg);
}

.ring-bg {
  stroke: var(--paper-3);
  opacity: 0.3;
}

.ring-progress {
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.ring-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.ring-value {
  font-size: calc(var(--ring-size, 120px) * 0.3);
  font-weight: 700;
  color: var(--ink-900);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ring-label {
  font-size: calc(var(--ring-size, 120px) * 0.12);
  font-weight: 600;
  color: var(--ink-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Pulsing animation for low values */
@keyframes ring-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.ring-progress[data-low="true"] {
  animation: ring-pulse 2s ease-in-out infinite;
}
</style>
