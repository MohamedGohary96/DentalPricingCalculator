<script setup>
defineProps({
  tone: { type: String, default: 'ink' }, // teal | amber | rose | ink
})
</script>

<template>
  <span :class="['dpc-badge', `dpc-badge-${tone}`]">
    <slot />
  </span>
</template>

<style scoped>
.dpc-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.dpc-badge-teal  { background: var(--teal-50);   color: var(--teal-700); }
.dpc-badge-amber { background: var(--warning-50); color: var(--warning-700); }
.dpc-badge-rose  { background: var(--danger-50);  color: var(--danger-700); }
.dpc-badge-ink   { background: var(--ink-200);    color: var(--ink-700); }
</style>
