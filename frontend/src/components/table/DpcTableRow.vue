<script setup>
/**
 * DpcTableRow - Polymorphic table row with hover elevation and selection
 * Supports variants: default (interactive), header, category
 */
const props = defineProps({
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  expandable: { type: Boolean, default: false },
  expanded: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  variant: {
    type: String,
    default: 'default',  // 'default' | 'header' | 'category'
  },
})

const emit = defineEmits(['click', 'select', 'expand'])

function handleClick(event) {
  if (props.disabled || props.variant !== 'default') return
  emit('click', event)
}

function handleKeydown(event) {
  if (props.disabled || props.variant !== 'default') return

  if (event.key === 'Enter') {
    event.preventDefault()
    emit('click', event)
  } else if (event.key === ' ' && props.selectable) {
    event.preventDefault()
    emit('select', event)
  }
}
</script>

<template>
  <div
    :class="[
      'dpc-table-row',
      `row-${variant}`,
      selected && 'is-selected',
      expanded && 'is-expanded',
      disabled && 'is-disabled',
    ]"
    :tabindex="variant === 'default' && !disabled ? 0 : -1"
    :role="variant === 'header' ? 'row' : 'row'"
    :aria-selected="variant === 'default' ? selected : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <slot />
  </div>
</template>

<style scoped>
.dpc-table-row {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  position: relative;
  min-height: 52px;
  border-bottom: 1px solid var(--line-soft);
}

/* ── Default interactive row ──────────────────────────────────── */
.row-default {
  transition:
    background-color 180ms var(--ease-out-expo),
    box-shadow 200ms var(--ease-out-expo),
    transform 200ms var(--ease-out-expo);
}

.row-default:hover:not(.is-disabled) {
  background: var(--surface-2);
  cursor: pointer;
  box-shadow:
    0 1px 3px rgba(0,0,0,0.04),
    0 2px 8px rgba(0,0,0,0.03);
  transform: translateY(-1px);
  z-index: 1;
}

.row-default.is-selected {
  background: var(--teal-50);
  box-shadow: inset 3px 0 0 0 var(--accent);
}

.row-default.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.row-default:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  z-index: 2;
}

/* ── Header row ───────────────────────────────────────────────── */
.row-header {
  background: var(--surface-0);
  min-height: 42px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-400);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 0 0 var(--line-soft);
}

/* ── Category row (grouping headers) ──────────────────────────── */
.row-category {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-600);
  background: var(--surface-2);
  min-height: 40px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
</style>
