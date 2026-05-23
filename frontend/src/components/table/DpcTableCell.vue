<script setup>
/**
 * DpcTableCell - Type-aware table cell with smart rendering
 * Supports: text, number, status, action, header types
 */
defineProps({
  type: {
    type: String,
    default: 'text',  // 'text' | 'number' | 'status' | 'action' | 'header'
  },
  align: {
    type: String,
    default: 'start',  // 'start' | 'center' | 'end'
  },
  width: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div
    :class="[
      'dpc-table-cell',
      `cell-${type}`,
      `align-${align}`,
    ]"
    :style="width ? { width } : {}"
    :role="type === 'header' ? 'columnheader' : 'cell'"
  >
    <slot />
  </div>
</template>

<style scoped>
.dpc-table-cell {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  min-width: 0;  /* allows text truncation */
  min-height: inherit;
}

/* ── Type variants ────────────────────────────────────────────── */

/* Text cells - default body text */
.cell-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-700);
  line-height: 1.4;
}

/* Number cells - monospace, tabular nums */
.cell-number {
  font-family: var(--font-mono);
  font-feature-settings: 'tnum' 1;  /* tabular numbers */
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
  direction: ltr;  /* always LTR for numbers */
  unicode-bidi: isolate;
}

/* Header cells - uppercase, tight tracking */
.cell-header {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-400);
  padding: 12px 20px;
  min-height: 42px;
}

/* Status cells - for chips/badges */
.cell-status {
  font-size: 13px;
}

/* Action cells - for buttons/icons */
.cell-action {
  padding: 12px 16px;
  gap: 8px;
}

/* ── Alignment ────────────────────────────────────────────────── */
.align-start {
  justify-content: flex-start;
  text-align: start;
}

.align-center {
  justify-content: center;
  text-align: center;
}

.align-end {
  justify-content: flex-end;
  text-align: end;
}

/* ── Truncation support ───────────────────────────────────────── */
.cell-text > :deep(*),
.cell-number > :deep(*) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
