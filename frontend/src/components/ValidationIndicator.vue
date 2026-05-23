<script setup>
import { computed } from 'vue'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  status: { type: String, default: 'idle', validator: v => ['idle', 'valid', 'invalid'].includes(v) },
  message: { type: String, default: '' }
})

const config = computed(() => {
  switch (props.status) {
    case 'valid':
      return { icon: 'Check', color: 'var(--success-600)', bg: 'var(--success-50)' }
    case 'invalid':
      return { icon: 'X', color: 'var(--danger-600)', bg: 'var(--danger-50)' }
    default:
      return null
  }
})
</script>

<template>
  <Transition name="validation">
    <div v-if="config" class="validation-indicator" :style="{ '--indicator-color': config.color, '--indicator-bg': config.bg }">
      <DpcIcon :name="config.icon" :size="14" :stroke-width="2.5" />
      <div v-if="message" class="validation-tooltip">{{ message }}</div>
    </div>
  </Transition>
</template>

<style scoped>
.validation-indicator {
  position: absolute;
  top: 50%;
  inset-inline-end: 12px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--indicator-bg);
  color: var(--indicator-color);
  z-index: 2;
}

.validation-tooltip {
  position: absolute;
  top: 50%;
  inset-inline-end: calc(100% + 8px);
  transform: translateY(-50%);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--ink-900);
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-fast);
  box-shadow: var(--shadow-md);
}

.validation-indicator:hover .validation-tooltip {
  opacity: 1;
}

.validation-enter-active {
  animation: validation-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.validation-leave-active {
  animation: validation-appear 0.2s reverse;
}

@keyframes validation-appear {
  from {
    opacity: 0;
    scale: 0.7;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
</style>
