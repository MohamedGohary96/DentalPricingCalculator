<script setup>
defineProps({
  padding: { type: String, default: '20px' },
})
</script>

<template>
  <div class="dpc-panel" :style="{ padding }">
    <slot />
  </div>
</template>

<style scoped>
.dpc-panel {
  background: var(--surface-1);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.dpc-panel:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}
</style>
