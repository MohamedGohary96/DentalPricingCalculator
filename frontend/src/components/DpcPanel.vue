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
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: inset 0 0 0 1px var(--line), var(--shadow-sm);
}
</style>
