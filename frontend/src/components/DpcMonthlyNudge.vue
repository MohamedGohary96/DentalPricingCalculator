<script setup>
/**
 * DpcMonthlyNudge — soft overlay modal shown once per calendar month.
 * Shows current vs stored health score.
 * Primary: go to price list. Ghost: dismiss.
 */
import { computed } from 'vue'
import { useRouter }      from 'vue-router'
import { useI18nStore }   from '@/stores/i18n.js'
import { useMonthlyNudge } from '@/composables/useMonthlyNudge.js'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  currentScore: { type: Number, default: 0 },
})

const router = useRouter()
const i18n   = useI18nStore()
const isAr   = computed(() => i18n.locale === 'ar')

const { dismissNudge, getStoredHealthScore } = useMonthlyNudge()

const storedScore  = getStoredHealthScore()
const scoreDelta   = computed(() => props.currentScore - storedScore)

const monthName = computed(() => {
  const d = new Date()
  return isAr.value
    ? d.toLocaleDateString('ar-EG', { month: 'long' })
    : d.toLocaleDateString('en-US', { month: 'long' })
})

const deltaColor = computed(() => {
  if (scoreDelta.value > 0) return 'var(--success-600)'
  if (scoreDelta.value < 0) return 'var(--danger-600)'
  return 'var(--ink-500)'
})

function goReview() {
  dismissNudge()
  router.push('/results/price-list')
}
</script>

<template>
  <Teleport to="body">
    <div class="mn-backdrop" @click.self="dismissNudge()">
      <div class="mn-modal" role="dialog" :aria-label="isAr ? 'مراجعة شهرية' : 'Monthly Review'">
        <!-- Header -->
        <div class="mn-header">
          <div class="mn-icon-wrap">
            <DpcIcon name="Calendar" :size="22" :stroke-width="1.6" />
          </div>
          <div>
            <h2 class="mn-title dpc-h">
              {{ isAr
                ? `حان وقت مراجعة أسعارك لشهر ${monthName}`
                : `It's ${monthName}. Time to review your pricing.` }}
            </h2>
            <p class="mn-sub">
              {{ isAr
                ? 'مراجعة دورية لأسعارك تضمن أن تكاليفك مغطاة دائماً.'
                : 'Regular price reviews keep your costs covered as your expenses change.' }}
            </p>
          </div>
          <button class="mn-close" @click="dismissNudge()" :aria-label="isAr ? 'إغلاق' : 'Close'">
            <DpcIcon name="X" :size="16" :stroke-width="2" />
          </button>
        </div>

        <!-- Score comparison -->
        <div class="mn-scores">
          <div class="score-block">
            <div class="score-val dpc-num">{{ storedScore || '—' }}</div>
            <div class="score-label">{{ isAr ? 'النتيجة السابقة' : 'Previous score' }}</div>
          </div>
          <div class="score-arrow">
            <DpcIcon
              :name="scoreDelta >= 0 ? 'TrendingUp' : 'TrendingDown'"
              :size="20"
              :stroke-width="1.8"
              :style="{ color: deltaColor }"
            />
            <span class="delta-val dpc-num" :style="{ color: deltaColor }">
              {{ scoreDelta > 0 ? '+' : '' }}{{ storedScore ? scoreDelta : '—' }}
            </span>
          </div>
          <div class="score-block">
            <div class="score-val dpc-num" style="color: var(--teal-700)">{{ currentScore }}</div>
            <div class="score-label">{{ isAr ? 'النتيجة الحالية' : 'Current score' }}</div>
          </div>
        </div>

        <!-- CTA buttons -->
        <div class="mn-actions">
          <button class="dpc-btn dpc-btn-teal mn-primary" @click="goReview()">
            {{ isAr ? 'مراجعة الأسعار' : 'Review prices' }}
            <DpcIcon
              :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'"
              :size="15"
              :stroke-width="2"
            />
          </button>
          <button class="mn-ghost" @click="dismissNudge()">
            {{ isAr ? 'ربما لاحقاً' : 'Maybe later' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mn-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 20, 36, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: 20px;
  animation: fade-in 0.2s ease;
}

.mn-modal {
  background: var(--surface);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-lg);
  max-width: 480px;
  width: 100%;
  padding: 28px;
  position: relative;
  animation: slide-up 0.28s var(--ease-spring);
}

.mn-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.mn-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  flex: none;
  box-shadow: inset 0 0 0 1px var(--teal-100);
}

.mn-title {
  font-size: 16px;
  margin-bottom: 6px;
  padding-inline-end: 32px;
}

.mn-sub {
  font-size: 13px;
  color: var(--ink-500);
  line-height: 1.55;
}

.mn-close {
  position: absolute;
  top: 20px;
  inset-inline-end: 20px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--ink-400);
  background: var(--paper-2);
  border: none;
  cursor: pointer;
  transition: background 0.12s;
}
.mn-close:hover { background: var(--line); color: var(--ink-700); }

/* Score comparison */
.mn-scores {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 16px;
  background: var(--paper-2);
  border-radius: var(--r);
  margin-bottom: 20px;
}

.score-block { text-align: center; }

.score-val {
  font-size: 32px;
  font-weight: 700;
  color: var(--ink-900);
  line-height: 1.1;
}

.score-label {
  font-size: 11px;
  color: var(--ink-500);
  margin-top: 4px;
}

.score-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.delta-val {
  font-size: 13px;
  font-weight: 600;
}

/* Actions */
.mn-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.mn-primary {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mn-ghost {
  height: 44px;
  padding: 0 18px;
  border-radius: var(--r);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-500);
  background: var(--paper-2);
  border: none;
  cursor: pointer;
  transition: background 0.12s;
}
.mn-ghost:hover { background: var(--line); }

/* Animations */
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* RTL */
[dir="rtl"] .mn-header { flex-direction: row-reverse; }
[dir="rtl"] .mn-actions { flex-direction: row-reverse; }
</style>
