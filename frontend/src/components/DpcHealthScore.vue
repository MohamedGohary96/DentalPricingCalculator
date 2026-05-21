<script setup>
/**
 * DpcHealthScore — sidebar practice health widget
 *
 * Can be used in two modes:
 *
 * 1. Pre-computed score  (legacy-compatible):
 *    <DpcHealthScore :score="72" />
 *
 * 2. Prop-based scoring (auto-computes internally):
 *    <DpcHealthScore
 *      :total-services="20"
 *      :priced-services="18"
 *      :market-priced-services="10"
 *      :underpriced-services="2"
 *      :onboarding-complete="true"
 *      :has-fixed-costs="true"
 *    />
 *
 * Score computation (max 100):
 *   +20  onboarding complete
 *   +5   per priced service       (max 30 — 6 services)
 *   +5   per market-priced svc    (max 20 — 4 services)
 *   -10  per underpriced service
 *   +10  has fixed costs entered
 *   +15  zero underpriced (bonus)
 *
 * Breakdown list shows per-category status at a glance.
 * Count-up and ring fill animate on mount + whenever score changes.
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'

// ── Props ─────────────────────────────────────────────────────────
const props = defineProps({
  // Legacy single-value mode — takes precedence if provided (>= 0)
  score: { type: Number, default: -1 },

  // Constituent-props mode (used when score = -1)
  totalServices:        { type: Number,  default: 0     },
  pricedServices:       { type: Number,  default: 0     },
  marketPricedServices: { type: Number,  default: 0     },
  underpricedServices:  { type: Number,  default: 0     },
  onboardingComplete:   { type: Boolean, default: false },
  hasFixedCosts:        { type: Boolean, default: false },
})

// ── i18n ──────────────────────────────────────────────────────────
const i18n = useI18nStore()
const isAr = computed(() => i18n.locale === 'ar')

// ── Score computation ─────────────────────────────────────────────
const computedScore = computed(() => {
  // Legacy mode: caller passes explicit score
  if (props.score >= 0) return Math.max(0, Math.min(100, props.score))

  let s = 0
  if (props.onboardingComplete)                                   s += 20
  s += Math.min(props.pricedServices      * 5, 30)
  s += Math.min(props.marketPricedServices * 5, 20)
  s -= props.underpricedServices * 10
  if (props.hasFixedCosts)                                        s += 10
  if (props.underpricedServices === 0 && props.pricedServices > 0) s += 15

  return Math.max(0, Math.min(100, s))
})

// ── Status text (bilingual) ───────────────────────────────────────
const statusText = computed(() => {
  const s = computedScore.value
  if (isAr.value) {
    if (s < 40) return 'يحتاج اهتمام'
    if (s < 60) return 'في الطريق'
    if (s < 80) return 'يبدو جيداً'
    return 'ممتاز'
  }
  if (s < 40) return 'Needs attention'
  if (s < 60) return 'Getting there'
  if (s < 80) return 'Looking good'
  return 'Excellent'
})

// ── Ring color ────────────────────────────────────────────────────
const ringColor = computed(() => {
  const s = computedScore.value
  if (s < 40) return 'var(--danger-600)'
  if (s < 70) return 'var(--warning-600)'
  return 'var(--success-600)'
})

// ── SVG ring geometry ─────────────────────────────────────────────
const SIZE         = 120
const STROKE_W     = 10
const RADIUS       = (SIZE - STROKE_W) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const targetOffset = computed(() => {
  const filled = computedScore.value / 100
  return CIRCUMFERENCE * (1 - filled)
})

// ── Animated values ───────────────────────────────────────────────
const displayValue   = ref(0)
const animatedOffset = ref(CIRCUMFERENCE)

function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

function animateTo(targetScore, duration = 800) {
  const startScore  = displayValue.value
  const startOffset = animatedOffset.value
  const endOffset   = targetOffset.value
  const startTime   = performance.now()

  function tick(now) {
    const t = Math.min((now - startTime) / duration, 1)
    const e = easeOut(t)

    displayValue.value   = Math.round(startScore  + (targetScore - startScore)   * e)
    animatedOffset.value =            startOffset + (endOffset   - startOffset)  * e

    if (t < 1) requestAnimationFrame(tick)
    else {
      displayValue.value   = targetScore
      animatedOffset.value = endOffset
    }
  }

  requestAnimationFrame(tick)
}

onMounted(() => animateTo(computedScore.value, 1200))

watch(computedScore, newScore => animateTo(newScore, 800))

// ── Breakdown list (constituent-props mode only) ──────────────────
const showBreakdown = computed(() => props.score < 0)

const breakdown = computed(() => [
  {
    label: isAr.value ? 'الخدمات المسعّرة' : 'Services priced',
    value: `${props.pricedServices} / ${props.totalServices}`,
    done:  props.pricedServices > 0,
    warn:  false,
  },
  {
    label: isAr.value ? 'مقارنة بالسوق' : 'Market-benchmarked',
    value: props.marketPricedServices,
    done:  props.marketPricedServices > 0,
    warn:  false,
  },
  {
    label: isAr.value ? 'منخفضة التسعير' : 'Underpriced',
    value: props.underpricedServices,
    done:  props.underpricedServices === 0,
    warn:  props.underpricedServices > 0,
  },
  {
    label: isAr.value ? 'التكاليف الثابتة' : 'Fixed costs',
    value: props.hasFixedCosts
      ? (isAr.value ? 'مدخلة' : 'Added')
      : (isAr.value ? 'مفقودة' : 'Missing'),
    done:  props.hasFixedCosts,
    warn:  !props.hasFixedCosts,
  },
  {
    label: isAr.value ? 'الإعداد الأولي' : 'Onboarding',
    value: props.onboardingComplete
      ? (isAr.value ? 'مكتمل' : 'Complete')
      : (isAr.value ? 'قيد الانتظار' : 'Pending'),
    done:  props.onboardingComplete,
    warn:  false,
  },
])
</script>

<template>
  <div class="hs-root">
    <!-- Ring -->
    <div class="hs-ring-wrap">
      <svg
        :width="SIZE"
        :height="SIZE"
        :viewBox="`0 0 ${SIZE} ${SIZE}`"
        class="hs-svg"
        aria-hidden="true"
      >
        <!-- Track (background ring) -->
        <circle
          :cx="SIZE / 2" :cy="SIZE / 2" :r="RADIUS"
          fill="none" :stroke-width="STROKE_W"
          class="hs-track"
        />
        <!-- Progress arc -->
        <circle
          :cx="SIZE / 2" :cy="SIZE / 2" :r="RADIUS"
          fill="none" :stroke-width="STROKE_W"
          :stroke="ringColor"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="animatedOffset"
          class="hs-progress"
          transform="rotate(-90 60 60)"
        />
      </svg>

      <!-- Center: score + /100 -->
      <div class="hs-center">
        <span
          class="hs-number dpc-num"
          :style="{ color: ringColor }"
          :aria-label="`Health score: ${displayValue} out of 100`"
        >
          {{ displayValue }}
        </span>
        <span class="hs-denom">/100</span>
      </div>
    </div>

    <!-- Label -->
    <div class="hs-label">
      {{ isAr ? 'صحة التسعير' : 'Pricing Health' }}
    </div>

    <!-- Status -->
    <div class="hs-status" :style="{ color: ringColor }">
      {{ statusText }}
    </div>

    <!-- Breakdown (only when computing from constituent props) -->
    <ul v-if="showBreakdown" class="hs-breakdown">
      <li
        v-for="item in breakdown"
        :key="item.label"
        class="hs-breakdown__item"
        :class="{
          'hs-breakdown__item--done': item.done,
          'hs-breakdown__item--warn': item.warn,
        }"
      >
        <span class="hs-breakdown__dot" />
        <span class="hs-breakdown__label">{{ item.label }}</span>
        <span class="hs-breakdown__value dpc-num">{{ item.value }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────────── */
.hs-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px 14px;
  background: var(--paper-2);
  border-radius: var(--r-md);
  box-shadow: inset 0 0 0 1px var(--line);
  width: 100%;
}

/* ── Ring ────────────────────────────────────────────────────────── */
.hs-ring-wrap {
  position: relative;
  width: 120px;
  height: 120px;
}

.hs-svg { display: block; }

.hs-track { stroke: var(--line); }

.hs-progress { transition: stroke 0.3s ease; }

/* Perfect-score pulse — keyframes in animations.css */
.hs-root:has(.hs-number[data-perfect]) .hs-ring-wrap {
  animation: pulse-ring 2s ease-out infinite;
  border-radius: 50%;
}

.hs-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.hs-number {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.hs-denom {
  font-size: 11px;
  color: var(--ink-400);
  font-family: var(--font-mono);
  margin-top: 1px;
}

/* ── Labels ──────────────────────────────────────────────────────── */
.hs-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-600);
  letter-spacing: 0.03em;
  text-align: center;
}

.hs-status {
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  transition: color 0.3s ease;
}

/* ── Breakdown list ──────────────────────────────────────────────── */
.hs-breakdown {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--line);
  padding-top: 10px;
  margin-top: 4px;
}

.hs-breakdown__item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}

.hs-breakdown__dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--ink-300);
  transition: background 0.2s ease;
}
.hs-breakdown__item--done .hs-breakdown__dot { background: var(--success-600); }
.hs-breakdown__item--warn .hs-breakdown__dot { background: var(--danger-600);  }

.hs-breakdown__label {
  flex: 1;
  text-align: start;
  color: var(--ink-600);
}

.hs-breakdown__value {
  font-size: 11px;
  color: var(--ink-800);
  font-weight: 500;
}
.hs-breakdown__item--done .hs-breakdown__value { color: var(--success-600); }
.hs-breakdown__item--warn .hs-breakdown__value { color: var(--danger-600);  }
</style>
