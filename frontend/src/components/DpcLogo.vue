<script setup>
defineProps({
  onDark: { type: Boolean, default: false },
})
</script>

<template>
  <div :class="['dpc-mark', onDark && 'on-dark']">
    <div class="dpc-mark-icon">
      <!-- tooth SVG path -->
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2c-3 0-5 2-5 5 0 2 1 3.5 1.5 5S10 14 10 16c0 1.5-.5 3-1.5 4h7c-1-1-1.5-2.5-1.5-4 0-2 1-3 1.5-4S17 9 17 7c0-3-2-5-5-5z"/>
        <path d="M9 22h6"/>
      </svg>
    </div>
    <span>DentPrice</span>
  </div>
</template>

<style scoped>
.dpc-mark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-head);
  font-weight: 600;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: var(--ink-900);
}
.dpc-mark.on-dark { color: #fff; }

.dpc-mark-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: linear-gradient(155deg, var(--teal-500), var(--teal-700));
  color: #fff;
  box-shadow: 0 4px 10px rgba(13,148,136,.25), inset 0 1px 0 rgba(255,255,255,.25);
  flex: none;
}
</style>
