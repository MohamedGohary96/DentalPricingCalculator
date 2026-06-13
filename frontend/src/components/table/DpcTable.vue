<script setup>
/**
 * DpcTable - Modern table container with loading and empty states
 * Premium light-mode design matching Linear/Notion aesthetic
 */
import DpcIcon from '@/components/DpcIcon.vue'

defineProps({
  loading: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  emptyIcon: { type: String, default: 'Table' },
  emptyMessage: { type: String, default: '' },
  minWidth: { type: String, default: '' },
})
</script>

<template>
  <div class="dpc-table-container">
    <!-- Loading skeleton -->
    <div v-if="loading" class="table-skeleton">
      <div v-for="i in 5" :key="i" class="skeleton-row" />
    </div>

    <!-- Empty state -->
    <div v-else-if="empty" class="table-empty">
      <DpcIcon :name="emptyIcon" :size="32" class="empty-icon" />
      <p class="empty-message">{{ emptyMessage }}</p>
      <slot name="empty-action" />
    </div>

    <!-- Table content -->
    <div v-else class="dpc-table-scroll" :style="minWidth ? { minWidth } : {}">
      <div class="dpc-table">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dpc-table-container {
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-xs);
  transition: border-color 200ms var(--ease-out-expo);
}

.dpc-table-container:hover {
  border-color: var(--line);
}

.dpc-table-scroll {
  overflow-x: auto;
  overflow-y: visible;
  /* Momentum scrolling on iOS + clamp overscroll so the page
     doesn't pan when a user swipes the table sideways. */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

/* When the consuming view switches to card-mode at small viewports
   it sets its own .dpc-table-row layout — the inline min-width must
   not force a horizontal scroll bar. The consumer is responsible
   for layout below this breakpoint. */
@media (max-width: 767px) {
  .dpc-table-scroll { min-width: 0 !important; overflow-x: visible; }
}

/* Custom scrollbar styling */
.dpc-table-scroll::-webkit-scrollbar {
  height: 8px;
}

.dpc-table-scroll::-webkit-scrollbar-track {
  background: var(--surface-2);
}

.dpc-table-scroll::-webkit-scrollbar-thumb {
  background: var(--ink-300);
  border-radius: 4px;
  transition: background 150ms;
}

.dpc-table-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--ink-400);
}

.dpc-table {
  width: 100%;
  min-width: 100%;
}

/* ── Empty state ──────────────────────────────────────────────── */
.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 32px;
  color: var(--ink-400);
}

.empty-icon {
  color: var(--ink-300);
  animation: float 4s var(--ease-in-out-expo) infinite;
}

.empty-message {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-500);
  margin: 0;
  text-align: center;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* ── Loading skeleton ─────────────────────────────────────────── */
.table-skeleton {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-row {
  height: 52px;
  background: linear-gradient(
    90deg,
    var(--surface-2) 25%,
    var(--surface-0) 50%,
    var(--surface-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
