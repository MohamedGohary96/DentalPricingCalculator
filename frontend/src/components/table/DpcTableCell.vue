<script setup>
/**
 * DpcTableCell - Type-aware table cell with smart rendering
 * Supports: text, number, status, action, header types
 *
 * `priority` drives responsive visibility:
 *   1 — always visible (headline columns)
 *   2 — hidden below the md breakpoint (≤767px)
 *   3 — hidden below the lg breakpoint (≤1023px)
 *
 * Note: when cells are hidden, the consuming view must also rewrite
 *   `grid-template-columns` at the same breakpoint so the surviving
 *   cells lay out correctly. Hiding alone leaves empty grid tracks.
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
  priority: {
    type: Number,
    default: 1,
    validator: v => [1, 2, 3].includes(v),
  },
  // Surfaced as data-label on the cell. The view's CSS can pick it up
  // via ::before { content: attr(data-label) } when the table flips
  // to a stacked card layout on phones.
  label: {
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
      `cell-priority-${priority}`,
    ]"
    :style="width ? { width } : {}"
    :role="type === 'header' ? 'columnheader' : 'cell'"
    :data-label="label || undefined"
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

/* ──────────────────────────────────────────────────────────────
   RESPONSIVE PRIORITY
   Hide low-priority cells below the matching breakpoint. Pair with
   matching grid-template-columns overrides in the consuming view.
   ────────────────────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .cell-priority-3 { display: none; }
}

@media (max-width: 767px) {
  .cell-priority-2 { display: none; }
}

/* Slightly tighter horizontal padding on phones to recover space.
   Keeps row height intact for touch comfort. */
@media (max-width: 767px) {
  .dpc-table-cell { padding-inline: 12px; }
  .cell-header { padding-inline: 12px; }
  .cell-action { padding-inline: 8px; }
}
</style>
