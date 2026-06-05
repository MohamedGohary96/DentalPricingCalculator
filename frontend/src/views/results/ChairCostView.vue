<script setup>
/**
 * ChairCostView — "Aha Moment" cinematic reveal of the real chair-hour cost.
 *
 * Sequence:
 *  0 ms  → navy screen, opacity 0
 *  300ms → label fades in "Your clinic costs..."
 *  700ms → number counts up from 0 → actual (1200ms, cubic-ease-out)
 *  1900ms (after count)  → currency + "/hr" suffix fades in
 *  2000ms → breakdown cards slide up with 120ms stagger
 *  all done → CTA button slides up
 */
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter }      from 'vue-router'
import DpcLogo            from '@/components/DpcLogo.vue'
import DpcIcon            from '@/components/DpcIcon.vue'
import DpcBtn             from '@/components/DpcBtn.vue'
import LangSwitch         from '@/components/LangSwitch.vue'
import { usePricingStore } from '@/stores/pricing.js'
import { useI18nStore }   from '@/stores/i18n.js'
import { useCountUp }     from '@/composables/useCountUp.js'
import axios from 'axios'

const router       = useRouter()
const pricingStore = usePricingStore()
const i18n         = useI18nStore()
const isAr         = computed(() => i18n.locale === 'ar')
const currency     = ref('EGP')

// ── Data ─────────────────────────────────────────────────────────
const stats     = computed(() => pricingStore.dashboardStats || {})
const cph       = computed(() => stats.value.chair_hourly_rate || 0)
const totalCost = computed(() => stats.value.total_fixed_monthly || 0)
const billableH = computed(() => stats.value.effective_hours || 0)

const breakdown = computed(() => {
  const s     = stats.value
  const total = totalCost.value || 1
  return [
    {
      id:    'fixed',
      label: isAr.value ? 'التكاليف الثابتة / ساعة' : 'Fixed costs / hr',
      value: s.fixed_costs || 0,
      raw:   Math.round(((s.fixed_costs || 0) / total) * cph.value),
      color: '#0F2545',
    },
    {
      id:    'salaries',
      label: isAr.value ? 'الرواتب / ساعة' : 'Salaries / hr',
      value: s.staff_salaries || 0,
      raw:   Math.round(((s.staff_salaries || 0) / total) * cph.value),
      color: '#0D9488',
    },
    {
      id:    'depreciation',
      label: isAr.value ? 'إهلاك المعدات / ساعة' : 'Equipment depreciation / hr',
      value: s.equipment_depreciation || 0,
      raw:   Math.round(((s.equipment_depreciation || 0) / total) * cph.value),
      color: '#94A3B8',
    },
  ]
})

const benchLow  = 240
const benchAvg  = 290
const benchHigh = 360

const youPosition = computed(() => {
  const range = benchHigh - benchLow
  const pos = Math.min(Math.max((cph.value - benchLow) / range, 0), 1)
  return (pos * 90 + 5) + '%'
})

const timeSlices = computed(() => [
  { label: isAr.value ? '٣٠ دقيقة' : '30 min', factor: 0.5 },
  { label: isAr.value ? '٤٥ دقيقة' : '45 min', factor: 0.75 },
  { label: isAr.value ? '٦٠ دقيقة' : '60 min', factor: 1 },
  { label: isAr.value ? '٩٠ دقيقة' : '90 min', factor: 1.5 },
])

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}
function pct(v, digs = 0) {
  return (v * 100).toFixed(digs) + '%'
}

// ── Animation state ───────────────────────────────────────────────
const showLabel      = ref(false)
const showNumber     = ref(false)
const showSuffix     = ref(false)
const showBreakdown  = ref(false)
const showCTA        = ref(false)
const visibleCards   = ref([])

const { displayValue, start: startCount } = useCountUp(cph, 1200)

async function runSequence() {
  await new Promise(r => setTimeout(r, 300))
  showLabel.value = true

  await new Promise(r => setTimeout(r, 400))
  showNumber.value = true
  startCount()

  // after count (1200ms) → suffix
  await new Promise(r => setTimeout(r, 1300))
  showSuffix.value = true

  // 100ms later → cards start appearing
  await new Promise(r => setTimeout(r, 100))
  showBreakdown.value = true

  // Stagger cards 120ms each
  for (let i = 0; i < breakdown.value.length; i++) {
    await new Promise(r => setTimeout(r, 120))
    visibleCards.value.push(i)
  }

  // Total card
  await new Promise(r => setTimeout(r, 120))
  visibleCards.value.push('total')

  // CTA
  await new Promise(r => setTimeout(r, 200))
  showCTA.value = true
}

onMounted(async () => {
  await Promise.all([
    pricingStore.loadDashboardStats(),
    axios.get('/api/settings/global', { withCredentials: true })
      .then(res => { currency.value = res.data.currency || 'EGP' })
      .catch(() => {}),
  ])
  await nextTick()
  runSequence()
})
</script>

<template>
  <div class="cc-shell">
    <!-- Topbar -->
    <header class="cc-topbar">
      <DpcLogo />
      <div class="cc-topbar-end">
        <DpcBtn
          variant="ghost"
          size="sm"
          :icon="i18n.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'"
          @click="router.push('/app/dashboard')"
        >
          {{ isAr ? 'لوحة التحكم' : 'Dashboard' }}
        </DpcBtn>
        <LangSwitch />
      </div>
    </header>

    <!-- Cinematic hero panel -->
    <div class="cc-hero">
      <div class="cc-hero-dots" />
      <div class="cc-hero-glow" />

      <div class="cc-hero-inner">
        <!-- "Your clinic costs..." label -->
        <Transition name="fade-up">
          <div v-if="showLabel" class="cc-label">
            {{ isAr ? 'تكلفة عيادتك...' : 'Your clinic costs...' }}
          </div>
        </Transition>

        <!-- Large number count-up -->
        <div class="cc-number-row">
          <Transition name="fade-scale">
            <div v-if="showNumber" class="cc-number-wrap">
              <span class="cc-number dpc-num">{{ fmt(displayValue) }}</span>
            </div>
          </Transition>

          <Transition name="fade-up">
            <div v-if="showSuffix" class="cc-suffix">
              <span class="cc-currency">{{ currency }}</span>
              <span class="cc-per-hr">{{ isAr ? '/ساعة' : '/hr' }}</span>
            </div>
          </Transition>
        </div>

        <!-- Time-slice mini-cards (visible once suffix is shown) -->
        <Transition name="fade-up">
          <div v-if="showSuffix" class="cc-slices">
            <div v-for="ts in timeSlices" :key="ts.label" class="cc-slice">
              <div class="slice-label">{{ ts.label }}</div>
              <div class="dpc-num slice-val">
                {{ fmt(cph * ts.factor) }}
                <span class="slice-unit">{{ currency }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Scrollable content area -->
    <div class="cc-body">
      <div class="cc-inner">
        <!-- Breakdown cards -->
        <div v-if="showBreakdown" class="cc-breakdown-grid">
          <!-- Individual cost components -->
          <div
            v-for="(b, idx) in breakdown"
            :key="b.id"
            :class="['cc-breakdown-card', visibleCards.includes(idx) ? 'is-visible' : 'is-hidden']"
          >
            <div class="bd-dot" :style="{ background: b.color }" />
            <div class="bd-label">{{ b.label }}</div>
            <div class="bd-value dpc-num">{{ fmt(b.raw) }} <span class="bd-unit">{{ currency }}</span></div>
            <div class="bd-pct dpc-num">{{ totalCost > 0 ? pct(b.value / totalCost) : '—' }}</div>
          </div>

          <!-- Total row (highlighted) -->
          <div
            :class="['cc-breakdown-card', 'cc-total-card', visibleCards.includes('total') ? 'is-visible' : 'is-hidden']"
          >
            <div class="bd-dot" style="background: #14b8a6;" />
            <div class="bd-label bd-total-label">{{ isAr ? 'الإجمالي / ساعة' : 'Total / hr' }}</div>
            <div class="bd-value bd-total-val dpc-num">
              {{ fmt(cph) }} <span class="bd-unit">{{ currency }}</span>
            </div>
            <div class="bd-pct dpc-num" style="color: var(--teal-700)">100%</div>
          </div>
        </div>

        <!-- Benchmark (shown after breakdown) -->
        <Transition name="fade-up">
          <div v-if="showBreakdown" class="cc-bench-card dpc-panel">
            <div class="card-eyebrow">{{ isAr ? 'مقارنة معيارية' : 'Market benchmark' }}</div>
            <div class="bench-sub">{{ isAr ? 'عيادتان كراسي بالقاهرة (٤٢ عيادة)' : 'Two-chair clinics in Cairo (42 clinics)' }}</div>
            <div class="bench-visual">
              <div class="bench-axis" />
              <div class="bench-band" />
              <div class="bench-tick" style="inset-inline-start: 5%">
                <div class="dpc-num tick-val">{{ fmt(benchLow) }}</div>
                <div class="tick-line" />
                <div class="tick-lbl">{{ isAr ? 'منخفض' : 'Low' }}</div>
              </div>
              <div class="bench-tick" style="inset-inline-start: 50%">
                <div class="dpc-num tick-val">{{ fmt(benchAvg) }}</div>
                <div class="tick-line" />
                <div class="tick-lbl">{{ isAr ? 'متوسط' : 'Avg' }}</div>
              </div>
              <div class="bench-tick" style="inset-inline-start: 95%">
                <div class="dpc-num tick-val">{{ fmt(benchHigh) }}</div>
                <div class="tick-line" />
                <div class="tick-lbl">{{ isAr ? 'مرتفع' : 'High' }}</div>
              </div>
              <div class="bench-you" :style="{ insetInlineStart: youPosition }">
                <div class="you-pill">
                  <span class="dpc-num">{{ fmt(cph) }}</span>
                  <span class="you-lbl">· {{ isAr ? 'أنت' : 'you' }}</span>
                </div>
                <div class="you-arrow" />
                <div class="you-dot" />
              </div>
            </div>
          </div>
        </Transition>

        <!-- CTA -->
        <Transition name="slide-up-cta">
          <div v-if="showCTA" class="cc-cta">
            <div>
              <div class="dpc-h cta-title">
                {{ isAr ? 'حان وقت الجزء المهم' : 'Time for the part that matters' }}
              </div>
              <div class="cta-sub">
                {{ isAr
                  ? 'اعرف أي خدماتك تغطي هذه التكلفة — وأيها يخسر.'
                  : 'See which services cover this cost — and which ones bleed.' }}
              </div>
            </div>
            <DpcBtn
              variant="teal"
              size="lg"
              :trailing-icon="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'"
              class="cta-btn"
              @click="router.push('/results/price-list')"
            >
              {{ isAr ? 'اعرف أي خدماتك تغطي هذه التكلفة' : 'See which services cover this cost' }}
            </DpcBtn>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Shell ──────────────────────────────────────────────────────── */
.cc-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--paper);
}

/* ── Topbar ─────────────────────────────────────────────────────── */
.cc-topbar {
  height: 60px;
  padding: 0 28px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.cc-topbar-end {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── Hero (navy panel) ──────────────────────────────────────────── */
.cc-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #0a1424 0%, #0f2545 100%);
  color: #fff;
  padding: 56px 48px 52px;
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cc-hero-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
}

.cc-hero-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(13,148,136,.35) 0%, transparent 60%);
  top: -200px;
  inset-inline-end: -180px;
  pointer-events: none;
}

.cc-hero-inner {
  position: relative;
  max-width: 900px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.cc-label {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255,255,255,.65);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── Number row ─────────────────────────────────────────────────── */
.cc-number-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px;
  direction: ltr;
  min-height: 110px;
}

.cc-number-wrap { display: flex; align-items: baseline; }

.cc-number {
  font-size: 96px;
  font-weight: 800;
  line-height: 1;
  color: #14b8a6;
  letter-spacing: -0.04em;
}

.cc-suffix {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 6px;
}

.cc-currency {
  font-size: 22px;
  font-weight: 600;
  color: rgba(255,255,255,.65);
}

.cc-per-hr {
  font-size: 14px;
  color: rgba(255,255,255,.45);
}

/* Time slices */
.cc-slices {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.cc-slice {
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.10);
  min-width: 100px;
  text-align: center;
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo);
  backdrop-filter: blur(8px);
}

.cc-slice:hover {
  background: rgba(255,255,255,.12);
  border-color: rgba(255,255,255,.20);
  transform: translateY(-2px);
}

.slice-label {
  font-size: 11.5px;
  color: rgba(255,255,255,.5);
  margin-bottom: 3px;
}

.slice-val {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.slice-unit {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 400;
  color: rgba(255,255,255,.45);
  margin-inline-start: 3px;
}

/* ── Body ───────────────────────────────────────────────────────── */
.cc-body {
  flex: 1;
  padding: 32px 48px 48px;
  overflow-y: auto;
}

.cc-inner {
  max-width: 880px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Breakdown cards grid ───────────────────────────────────────── */
.cc-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.cc-breakdown-card {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border-radius: var(--r);
  box-shadow: inset 0 0 0 1px var(--line);
  transition: transform 0.3s var(--ease-spring), opacity 0.3s ease, box-shadow 0.2s var(--ease-out-expo);
  cursor: default;
}

.cc-breakdown-card:hover {
  box-shadow: inset 0 0 0 1px var(--line), 0 4px 12px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.cc-breakdown-card.is-hidden {
  opacity: 0;
  transform: translateY(16px);
}

.cc-breakdown-card.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.cc-total-card {
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1.5px var(--teal-200);
}

.cc-total-card:hover {
  background: var(--teal-100);
  box-shadow: inset 0 0 0 1.5px var(--teal-300), 0 6px 16px rgba(20,184,166,0.15);
}

.bd-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}

.bd-label {
  font-size: 13px;
  color: var(--ink-700);
  font-weight: 400;
}

.bd-total-label { font-weight: 600; color: var(--ink-900); }

.bd-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink-900);
  text-align: end;
}

.bd-total-val { font-size: 20px; color: var(--teal-700); }

.bd-unit {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 400;
  color: var(--ink-400);
  margin-inline-start: 2px;
}

.bd-pct {
  font-size: 12px;
  color: var(--ink-400);
  min-width: 36px;
  text-align: end;
}

/* ── Benchmark card ─────────────────────────────────────────────── */
.cc-bench-card {
  padding: 22px 24px;
}

.card-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-500);
  margin-bottom: 4px;
}

.bench-sub {
  font-size: 12.5px;
  color: var(--ink-500);
  margin-bottom: 20px;
}

.bench-visual {
  position: relative;
  height: 100px;
  margin-bottom: 4px;
}

.bench-axis {
  position: absolute;
  inset-inline: 0;
  top: 50px;
  height: 6px;
  border-radius: 999px;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
}

.bench-band {
  position: absolute;
  inset-inline-start: 20%;
  width: 60%;
  top: 47px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--teal-100), var(--teal-300), var(--teal-100));
}

.bench-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  text-align: center;
}

.tick-val  { font-size: 12px; color: var(--ink-500); margin-bottom: 8px; }
.tick-line { width: 1px; height: 18px; background: var(--ink-300); margin: 0 auto; }
.tick-lbl  { font-size: 11px; color: var(--ink-500); margin-top: 6px; white-space: nowrap; }

.bench-you {
  position: absolute;
  top: 28px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.you-pill {
  background: var(--ink-900);
  color: #fff;
  padding: 4px 10px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(15,37,69,.20);
}

.you-lbl {
  color: rgba(255,255,255,.55);
  font-size: 10px;
  font-weight: 400;
  font-family: var(--font-sans);
}

.you-arrow {
  width: 0;
  height: 0;
  border-inline: 5px solid transparent;
  border-top: 6px solid var(--ink-900);
}

.you-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink-900);
  box-shadow: 0 0 0 4px #fff, 0 0 0 5px var(--ink-900);
  margin-top: -3px;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    box-shadow: 0 0 0 4px #fff, 0 0 0 5px var(--ink-900);
  }
  50% {
    box-shadow: 0 0 0 4px #fff, 0 0 0 5px var(--ink-900), 0 0 0 10px rgba(10,20,36,0.2);
  }
}

/* ── CTA strip ──────────────────────────────────────────────────── */
.cc-cta {
  padding: 28px 32px;
  border-radius: var(--radius-lg, 14px);
  background: linear-gradient(135deg, var(--paper) 0%, var(--surface) 100%);
  box-shadow: inset 0 0 0 1px var(--line), 0 4px 16px rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  position: relative;
  overflow: hidden;
}

.cc-cta::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(20,184,166,0.05), transparent 70%);
  pointer-events: none;
}

.cta-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}

.cta-sub {
  font-size: 14px;
  color: var(--ink-600);
  line-height: 1.5;
}

.cta-btn {
  flex: none;
  white-space: nowrap;
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo);
}

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(20,184,166,0.25);
}

/* ── Transitions ────────────────────────────────────────────────── */
.fade-up-enter-active   { transition: opacity 0.4s ease, transform 0.4s ease; }
.fade-up-enter-from     { opacity: 0; transform: translateY(10px); }
.fade-up-enter-to       { opacity: 1; transform: translateY(0); }

.fade-scale-enter-active { transition: opacity 0.3s ease, transform 0.3s var(--ease-spring); }
.fade-scale-enter-from   { opacity: 0; transform: scale(0.85); }
.fade-scale-enter-to     { opacity: 1; transform: scale(1); }

.slide-up-cta-enter-active { transition: opacity 0.4s ease, transform 0.4s var(--ease-spring); }
.slide-up-cta-enter-from   { opacity: 0; transform: translateY(24px); }
.slide-up-cta-enter-to     { opacity: 1; transform: translateY(0); }

/* ── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 680px) {
  .cc-hero { padding: 40px 20px 36px; }
  .cc-number { font-size: 64px; }
  .cc-body { padding: 20px; }
  .cc-breakdown-grid { grid-template-columns: 1fr; }
  .cc-cta { flex-direction: column; text-align: center; }
  .cta-btn { width: 100%; justify-content: center; }
  .cc-slices { flex-direction: row; }
}

/* RTL */
[dir="rtl"] .cc-number-row { direction: rtl; }
[dir="rtl"] .cc-cta { flex-direction: row-reverse; }
</style>
