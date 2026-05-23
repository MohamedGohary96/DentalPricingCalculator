<script setup>
import DpcIcon from './DpcIcon.vue'

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) }
})
</script>

<template>
  <div :class="['trust-badge', `trust-badge--${size}`]">
    <DpcIcon :name="icon" :size="size === 'sm' ? 11 : 13" :stroke-width="1.8" />
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--paper-2);
  color: var(--ink-600);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.trust-badge--sm {
  padding: 4px 10px;
  font-size: 11px;
  gap: 5px;
}

.trust-badge--md {
  padding: 6px 12px;
  font-size: 12px;
  gap: 6px;
}

.trust-badge:hover {
  background: var(--paper-3);
  color: var(--ink-800);
}
</style>
