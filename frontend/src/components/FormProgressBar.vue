<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentStep: { type: Number, required: true },
  totalSteps: { type: Number, required: true },
  labels: { type: Array, default: () => [] }
})

const segments = computed(() => {
  return Array.from({ length: props.totalSteps }, (_, i) => ({
    step: i + 1,
    status: i + 1 < props.currentStep ? 'completed' : i + 1 === props.currentStep ? 'active' : 'pending',
    label: props.labels[i] || `Step ${i + 1}`
  }))
})
</script>

<template>
  <div class="progress-bar">
    <div class="progress-track">
      <div
        v-for="seg in segments"
        :key="seg.step"
        :class="['progress-segment', `progress-segment--${seg.status}`]"
      >
        <div class="segment-fill" />
      </div>
    </div>
    <div class="progress-labels">
      <div
        v-for="seg in segments"
        :key="seg.step"
        :class="['progress-label', `progress-label--${seg.status}`]"
      >
        <span class="label-number">{{ seg.step }}</span>
        <span class="label-text">{{ seg.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-bar {
  width: 100%;
  margin-bottom: 32px;
}

.progress-track {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.progress-segment {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--line);
  overflow: hidden;
  position: relative;
}

.segment-fill {
  height: 100%;
  width: 0;
  background: var(--ink-300);
  border-radius: var(--radius-full);
  transition: width 0.4s var(--ease-spring), background 0.3s;
}

.progress-segment--active .segment-fill {
  width: 100%;
  background: var(--teal-600);
  animation: pulse-glow 2s ease-in-out infinite;
}

.progress-segment--completed .segment-fill {
  width: 100%;
  background: var(--success-600);
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.progress-labels {
  display: flex;
  justify-content: space-between;
}

.progress-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ink-400);
  transition: color var(--transition-fast);
}

.progress-label--active {
  color: var(--teal-700);
  font-weight: 600;
}

.progress-label--completed {
  color: var(--success-700);
  font-weight: 500;
}

.label-number {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--paper-2);
  font-size: 10px;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.progress-label--active .label-number {
  background: var(--teal-100);
  color: var(--teal-700);
  box-shadow: 0 0 0 3px var(--teal-50);
}

.progress-label--completed .label-number {
  background: var(--success-100);
  color: var(--success-700);
}

.label-text {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .label-text {
    display: none;
  }
}
</style>
