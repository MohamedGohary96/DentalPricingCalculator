<script setup>
const props = defineProps({
  tone:     { type: String,  default: '' },       // teal | amber | rose | navy | ''
  selected: { type: Boolean, default: null },     // null = display-only, true/false = interactive
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:selected'])

const isInteractive = () => props.selected !== null

function toggle() {
  if (!isInteractive() || props.disabled) return
  emit('update:selected', !props.selected)
}

function onKeydown(e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    toggle()
  }
}
</script>

<template>
  <span
    :class="[
      'dpc-chip',
      tone && `dpc-chip-${tone}`,
      isInteractive() && 'dpc-chip-interactive',
      selected && 'dpc-chip-selected',
      disabled && 'dpc-chip-disabled',
    ]"
    v-bind="isInteractive() ? {
      role: 'checkbox',
      'aria-checked': String(!!selected),
      tabindex: disabled ? -1 : 0,
    } : {}"
    @click="toggle"
    @keydown="onKeydown"
  >
    <slot />
  </span>
</template>

<style scoped>
.dpc-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  color: var(--ink-700);
}
.dpc-chip-interactive {
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
  user-select: none;
}
.dpc-chip-interactive:hover:not(.dpc-chip-disabled) {
  background: var(--teal-50);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1px var(--teal-200);
}
.dpc-chip-interactive:focus-visible {
  outline: 2px solid var(--teal-600);
  outline-offset: 2px;
}
.dpc-chip-selected {
  background: rgba(20,184,166,0.12) !important;
  color: var(--teal-700) !important;
  box-shadow: inset 0 0 0 1.5px var(--teal-400) !important;
}
.dpc-chip-disabled { opacity: 0.5; cursor: not-allowed; }

.dpc-chip-teal  { background: var(--teal-50);    color: var(--teal-700);    box-shadow: inset 0 0 0 1px var(--teal-100); }
.dpc-chip-amber { background: var(--warning-50);  color: var(--warning-700); box-shadow: inset 0 0 0 1px var(--warning-100); }
.dpc-chip-rose  { background: var(--danger-50);   color: var(--danger-700);  box-shadow: inset 0 0 0 1px var(--danger-100); }
.dpc-chip-navy  { background: rgba(15,37,69,.06); color: var(--navy-900);    box-shadow: inset 0 0 0 1px rgba(15,37,69,.10); }
</style>
