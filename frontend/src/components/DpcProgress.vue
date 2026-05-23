<script setup>
/**
 * DpcProgress — progress indicator (bar or ring)
 *
 * Usage — bar:
 *   <DpcProgress :value="72" variant="bar" color="success" />
 *
 * Usage — ring with inner slot (health score):
 *   <DpcProgress :value="score" variant="ring" size="lg" color="success">
 *     <span class="dpc-num">{{ score }}</span>
 *   </DpcProgress>
 *
 * Both variants animate from 0 → value on mount via requestAnimationFrame
 * so the browser can honour prefers-reduced-motion without JS branching.
 */

import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  value:   { type: Number,  default: 0, validator: v => v >= 0 && v <= 100 },
  variant: {
    type:      String,
    default:   'bar',
    validator: v => ['bar', 'ring'].includes(v),
  },
  size:    {
    type:      String,
    default:   'md',
    validator: v => ['sm', 'md', 'lg'].includes(v),
  },
  color:   {
    type:      String,
    default:   'primary',
    validator: v => ['primary', 'success', 'warning', 'danger'].includes(v),
  },
})

// ── Animated value ───────────────────────────────────────────────
// We count up from 0 to props.value on mount using rAF with a
// cubic-ease-out curve, then track prop changes after that.
const displayValue = ref(0)

function animateTo(target, duration = 800) {
  const start     = displayValue.value
  const startTime = performance.now()

  function step(now) {
    const elapsed  = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // Cubic ease-out: 1 - (1 - t)^3
    const eased    = 1 - Math.pow(1 - progress, 3)
    displayValue.value = Math.round(start + (target - start) * eased)
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

onMounted(() => animateTo(props.value))

watch(() => props.value, newVal => animateTo(newVal))

// ── Ring geometry ────────────────────────────────────────────────
const RING_SIZES = { sm: 52, md: 72, lg: 96 }
const STROKE_W   = { sm: 4,  md: 5,  lg: 6  }

const ringSize  = computed(() => RING_SIZES[props.size] ?? 72)
const strokeW   = computed(() => STROKE_W[props.size]   ?? 5)
const radius    = computed(() => (ringSize.value - strokeW.value) / 2)
const circumf   = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(
  () => circumf.value * (1 - displayValue.value / 100)
)

// ── Color token mapping ───────────────────────────────────────────
const COLOR_VARS = {
  primary: 'var(--teal-600, #0d9488)',
  success: 'var(--success-600, #059669)',
  warning: 'var(--warning-600, #d97706)',
  danger:  'var(--danger-600, #dc2626)',
}

const colorVar = computed(() => COLOR_VARS[props.color] ?? COLOR_VARS.primary)
</script>

<template>
  <!-- ── BAR variant ──────────────────────────────────────────── -->
  <div
    v-if="variant === 'bar'"
    class="progress-bar-wrap"
    :class="`progress-bar-wrap--${size}`"
    role="progressbar"
    :aria-valuenow="displayValue"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="progress-bar-track"
      :class="`progress-bar-track--${size}`"
    >
      <div
        class="progress-bar-fill"
        :style="{
          width:      `${displayValue}%`,
          background: colorVar,
        }"
      />
    </div>
  </div>

  <!-- ── RING variant ─────────────────────────────────────────── -->
  <div
    v-else
    class="progress-ring-wrap"
    :class="[`progress-ring-wrap--${size}`, value >= 100 && 'progress-ring-wrap--perfect']"
    role="progressbar"
    :aria-valuenow="displayValue"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <svg
      :width="ringSize"
      :height="ringSize"
      class="progress-ring-svg"
      :viewBox="`0 0 ${ringSize} ${ringSize}`"
      fill="none"
    >
      <!-- Track -->
      <circle
        class="ring-track"
        :cx="ringSize / 2"
        :cy="ringSize / 2"
        :r="radius"
        :stroke-width="strokeW"
      />
      <!-- Progress arc — starts at 12 o'clock (rotate -90deg in CSS) -->
      <circle
        class="ring-fill"
        :cx="ringSize / 2"
        :cy="ringSize / 2"
        :r="radius"
        :stroke-width="strokeW"
        :stroke="colorVar"
        :stroke-dasharray="circumf"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
      />
    </svg>

    <!-- Inner content slot (e.g. score number) -->
    <div class="progress-ring-inner" :class="`progress-ring-inner--${size}`">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* ── BAR ─────────────────────────────────────────────────────────── */
.progress-bar-wrap { width: 100%; }

.progress-bar-track {
  width: 100%;
  background: var(--line, #e7e5e0);
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}
.progress-bar-track--sm { height: 4px; }
.progress-bar-track--md { height: 7px; }
.progress-bar-track--lg { height: 10px; }

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full, 9999px);
  /* Transition driven by displayValue rAF updates — no extra CSS needed */
  will-change: width;
}

/* ── RING ────────────────────────────────────────────────────────── */
.progress-ring-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Perfect score pulse (animation defined in animations.css) */
.progress-ring-wrap--perfect {
  border-radius: var(--radius-full, 9999px);
  animation: pulse-ring 2s ease-out infinite;
}

.progress-ring-svg {
  /* Rotate so arc starts at 12 o'clock */
  transform: rotate(-90deg);
}

.ring-track {
  stroke: var(--line, #e7e5e0);
  fill: none;
}

.ring-fill {
  fill: none;
  transition: stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Inner slot overlay — centered over the SVG */
.progress-ring-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}

.progress-ring-inner--sm { font-size: var(--text-xs,   0.75rem);   }
.progress-ring-inner--md { font-size: var(--text-sm,   0.8125rem); }
.progress-ring-inner--lg { font-size: var(--text-base, 0.9063rem); }
</style>
