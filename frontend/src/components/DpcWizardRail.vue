<script setup>
import DpcIcon from './DpcIcon.vue'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  activeStep: { type: Number, default: 1 }, // 1–4
})

const i18n = useI18nStore()

const steps = [
  { id: 1, labelKey: 'onboarding.step2label' },
  { id: 2, labelKey: 'onboarding.step3label' },
  { id: 3, labelKey: 'onboarding.step4label' },
]

const fallbacks = ['Location', 'Costs & Capacity', 'Settings']

function label(step, idx) {
  const k = i18n.t(step.labelKey)
  return k === step.labelKey ? fallbacks[idx] : k
}
</script>

<template>
  <div class="rail">
    <div
      v-for="(step, idx) in steps"
      :key="step.id"
      :class="['rail-step', step.id < activeStep ? 'done' : step.id === activeStep ? 'active' : 'pending']"
    >
      <div class="dot">
        <DpcIcon v-if="step.id < activeStep" name="Check" :size="13" :stroke-width="2.4" />
        <span v-else>{{ String(step.id).padStart(2, '0') }}</span>
      </div>
      <div class="meta">
        <div class="step-tag">Step {{ step.id }} / 3</div>
        <div class="step-name">{{ label(step, idx) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rail { display: flex; flex-direction: column; gap: 22px; }

.rail-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  position: relative;
}

.rail-step + .rail-step::before {
  content: '';
  position: absolute;
  inset-inline-start: 11.5px;
  top: -22px;
  height: 22px;
  width: 1px;
  background: var(--line);
}
.rail-step.done + .rail-step::before,
.rail-step + .rail-step.active::before { background: var(--teal-300); }

.dot {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1.5px var(--ink-200);
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-500);
  flex: none;
  position: relative;
  z-index: 1;
}
.done .dot { background: var(--teal-600); box-shadow: none; color: #fff; }
.active .dot { background: var(--ink-900); color: #fff; box-shadow: 0 0 0 4px rgba(15,37,69,.08); }

.meta { padding-top: 1px; }
.step-tag {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--ink-400);
  text-transform: uppercase;
}
.step-name {
  font-size: 13.5px;
  color: var(--ink-700);
  font-weight: 500;
  margin-top: 1px;
}
.active .step-name { color: var(--ink-900); font-weight: 600; }
.done .step-name   { color: var(--ink-500); }
</style>
