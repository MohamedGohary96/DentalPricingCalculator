<script setup>
import DpcLogo from '@/components/DpcLogo.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import DpcWizardRail from '@/components/DpcWizardRail.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'
import { useRouter } from 'vue-router'

const props = defineProps({
  activeStep:     { type: Number,  default: 1 },
  showRail:       { type: Boolean, default: true },
  transitionDir:  { type: String,  default: 'forward' }, // 'forward' | 'back'
})

const i18n  = useI18nStore()
const router = useRouter()

const transitionName = computed(() =>
  props.transitionDir === 'back' ? 'wiz-step-back' : 'wiz-step'
)

// Mobile stepper labels — mirror DpcWizardRail's source of truth
const STEP_LABEL_KEYS = ['onboarding.step2label', 'onboarding.step3label', 'onboarding.step4label']
const STEP_FALLBACKS  = ['Location', 'Costs & Capacity', 'Settings']

const currentStepLabel = computed(() => {
  const idx = Math.min(Math.max(props.activeStep - 1, 0), STEP_LABEL_KEYS.length - 1)
  const k = i18n.t(STEP_LABEL_KEYS[idx])
  return k === STEP_LABEL_KEYS[idx] ? STEP_FALLBACKS[idx] : k
})

const stepOfLabel = computed(() => {
  if (i18n.locale === 'ar') return `الخطوة ${props.activeStep} من 3`
  return `Step ${props.activeStep} of 3`
})
</script>

<template>
  <div class="wiz-shell">
    <!-- Topbar -->
    <header class="wiz-topbar">
      <DpcLogo />
      <div class="wiz-topbar-end">
        <span class="wiz-setup-label">{{ i18n.locale === 'ar' ? 'إعداد العيادة' : 'Clinic setup' }}</span>
        <div class="wiz-divider" />
        <button class="dpc-btn dpc-btn-ghost wiz-save-btn" @click="router.push('/app/dashboard')">
          {{ i18n.locale === 'ar' ? 'حفظ وخروج' : 'Save & exit' }}
        </button>
        <LangSwitch />
      </div>
    </header>

    <!-- Mobile stepper — visible only below the lg breakpoint -->
    <div v-if="showRail" class="wiz-mobile-stepper" aria-hidden="false">
      <div class="wiz-mobile-stepper__meta">
        <span class="wiz-mobile-stepper__of">{{ stepOfLabel }}</span>
        <span class="wiz-mobile-stepper__sep">·</span>
        <span class="wiz-mobile-stepper__label">{{ currentStepLabel }}</span>
      </div>
      <div class="wiz-mobile-stepper__bar" :aria-label="stepOfLabel">
        <span
          v-for="n in 3"
          :key="n"
          :class="['wiz-seg', n < activeStep && 'is-done', n === activeStep && 'is-active']"
        />
      </div>
    </div>

    <!-- Body -->
    <div class="wiz-body">
      <!-- Rail -->
      <aside v-if="showRail" class="wiz-rail">
        <div class="wiz-rail-eyebrow">{{ i18n.t('setup.eyebrow') || 'Setup wizard' }}</div>
        <h3 class="dpc-h wiz-rail-title">{{ i18n.locale === 'ar' ? 'إعداد العيادة' : 'Setup wizard' }}</h3>
        <DpcWizardRail :active-step="activeStep" />
        <div class="wiz-rail-note">
          <div class="wiz-rail-note-title">
            <DpcIcon name="Info" :size="14" :stroke-width="1.6" />
            {{ i18n.locale === 'ar' ? 'ملحوظة سريعة' : 'A quick note' }}
          </div>
          <p>{{ i18n.locale === 'ar'
            ? 'أرقام معبّأة تلقائياً من متوسطات ٣٠٠+ عيادة مشابهة. عدّل ما لا يتطابق.'
            : 'Pre-filled numbers come from 300+ similar clinics. Tweak anything that doesn\'t match.' }}</p>
        </div>
      </aside>

      <!-- Content -->
      <div class="wiz-content">
        <Transition :name="transitionName" mode="out-in">
          <div class="wiz-content-inner" :key="activeStep">
            <slot />
          </div>
        </Transition>
      </div>
    </div>

    <!-- Footer -->
    <footer class="wiz-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.wiz-shell {
  display: flex;
  flex-direction: column;
  /* Dynamic viewport — see AppShell for rationale. */
  height: 100vh;
  height: 100svh;
  width: 100%;
  overflow: hidden;
  background: var(--paper);
}

.wiz-topbar {
  height: 60px;
  padding: 0 28px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.wiz-topbar-end {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wiz-setup-label {
  font-size: 12.5px;
  color: var(--ink-500);
}

.wiz-divider {
  width: 1px;
  height: 18px;
  background: var(--line);
}

.wiz-save-btn {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--ink-600);
  box-shadow: inset 0 0 0 1px var(--line);
}

.wiz-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.wiz-rail {
  width: 280px;
  flex: none;
  background: var(--surface);
  border-inline-end: 1px solid var(--line);
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.wiz-rail-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--teal-700);
  margin-bottom: 4px;
}

.wiz-rail-title {
  font-size: 18px;
  margin-top: 10px;
  margin-bottom: 26px;
}

.wiz-rail-note {
  margin-top: auto;
  padding-top: 24px;
  background: var(--paper-2);
  border-radius: 12px;
  padding: 14px;
  font-size: 12.5px;
  color: var(--ink-600);
  box-shadow: inset 0 0 0 1px var(--line);
}

.wiz-rail-note-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--ink-800);
  margin-bottom: 4px;
}

.wiz-rail-note p {
  margin: 0;
  line-height: 1.55;
}

.wiz-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 44px 56px;
  min-width: 0;
}

.wiz-content-inner {
  max-width: 880px;
  margin: 0 auto;
}

/* Step transitions — direction reverses in RTL so forward motion
   always feels like "next" no matter the reading direction. */
.wiz-shell { --wiz-tx: 32px; }
html[dir="rtl"] .wiz-shell { --wiz-tx: -32px; }

/* Forward step transition */
.wiz-step-enter-active,
.wiz-step-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.wiz-step-enter-from { opacity: 0; transform: translateX(var(--wiz-tx)); }
.wiz-step-leave-to   { opacity: 0; transform: translateX(calc(var(--wiz-tx) * -1)); }

/* Back step transition */
.wiz-step-back-enter-active,
.wiz-step-back-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.wiz-step-back-enter-from { opacity: 0; transform: translateX(calc(var(--wiz-tx) * -1)); }
.wiz-step-back-leave-to   { opacity: 0; transform: translateX(var(--wiz-tx)); }

.wiz-footer {
  flex: none;
  height: 76px;
  padding: 0 56px 0 336px;
  background: var(--surface);
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ──────────────────────────────────────────────────────────────
   MOBILE STEPPER — hidden on desktop. Below lg it replaces the
   vertical rail with a compact horizontal segment bar + label.
   ────────────────────────────────────────────────────────────── */
.wiz-mobile-stepper { display: none; }

.wiz-mobile-stepper__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-500);
  margin-bottom: 8px;
}
.wiz-mobile-stepper__label { color: var(--ink-900); font-weight: 600; }
.wiz-mobile-stepper__sep   { color: var(--ink-300); }

.wiz-mobile-stepper__bar {
  display: flex;
  gap: 6px;
}
.wiz-seg {
  flex: 1 1 0;
  height: 4px;
  border-radius: 999px;
  background: var(--line);
  transition: background 200ms ease;
}
.wiz-seg.is-done   { background: var(--teal-500); }
.wiz-seg.is-active { background: var(--teal-600); }

/* ──────────────────────────────────────────────────────────────
   LG BAND (1024–1279px) — tighten rail and content padding
   ────────────────────────────────────────────────────────────── */
@media (min-width: 1024px) and (max-width: 1279px) {
  .wiz-rail { width: 220px; padding: 28px 20px; }
  .wiz-content { padding: 32px 32px; }
  .wiz-footer { padding-inline-start: 252px; padding-inline-end: 32px; }
}

/* ──────────────────────────────────────────────────────────────
   BELOW LG — rail hidden, mobile stepper visible, footer becomes
   a sticky action bar with safe-area padding. Content uses fluid
   gutters set in tokens.css.
   ────────────────────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .wiz-shell { height: 100vh; height: 100svh; }

  .wiz-topbar { height: 56px; padding: 0 var(--gutter, 16px); }
  .wiz-setup-label { display: none; }
  .wiz-divider     { display: none; }
  .wiz-save-btn    { height: 36px; padding: 0 10px; font-size: 12.5px; }

  .wiz-mobile-stepper {
    display: block;
    padding: 12px var(--gutter, 16px) 14px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }

  .wiz-rail { display: none; }

  .wiz-content { padding: 24px var(--gutter, 16px) 32px; }
  .wiz-content-inner { max-width: none; }

  .wiz-footer {
    height: auto;
    min-height: 64px;
    padding: 12px var(--gutter, 16px);
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
    gap: 8px;
    /* Allow tertiary actions (e.g. "Skip with defaults") to wrap to
       a new row on narrow viewports rather than crushing the primary
       Back/Next pair. */
    flex-wrap: wrap;
    box-shadow: 0 -2px 12px rgba(15, 37, 69, 0.06);
  }
}

@media (max-width: 480px) {
  .wiz-topbar { height: 52px; }
  .wiz-content { padding: 20px var(--gutter, 16px) 24px; }
  .wiz-mobile-stepper__meta { font-size: 12px; }
}
</style>
