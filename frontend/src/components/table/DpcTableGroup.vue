<script setup>
/**
 * DpcTableGroup - Category/section header for grouping table rows
 * Used in PriceListView to group services by category
 */
import DpcIcon from '@/components/DpcIcon.vue'

defineProps({
  label: { type: String, required: true },
  count: { type: Number, default: 0 },
  icon: { type: String, default: '' },
  collapsible: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
})

defineEmits(['toggle'])
</script>

<template>
  <div
    :class="['dpc-table-group', collapsible && 'is-collapsible']"
    :role="collapsible ? 'button' : undefined"
    :tabindex="collapsible ? 0 : undefined"
    @click="collapsible && $emit('toggle')"
    @keydown.enter="collapsible && $emit('toggle')"
    @keydown.space.prevent="collapsible && $emit('toggle')"
  >
    <div class="group-content">
      <DpcIcon
        v-if="collapsible"
        :name="collapsed ? 'ChevronRight' : 'ChevronDown'"
        :size="14"
        :stroke-width="2"
        class="group-chevron"
      />
      <DpcIcon
        v-if="icon"
        :name="icon"
        :size="15"
        :stroke-width="1.8"
        class="group-icon"
      />
      <span class="group-label">{{ label }}</span>
      <span v-if="count > 0" class="group-count">{{ count }}</span>
    </div>
    <slot name="actions" />
  </div>
</template>

<style scoped>
.dpc-table-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--surface-2);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line-soft);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-600);
  letter-spacing: 0.02em;
  user-select: none;
  transition: background 150ms var(--ease-out-expo);
}

.is-collapsible {
  cursor: pointer;
}

.is-collapsible:hover {
  background: var(--surface-3);
  color: var(--ink-900);
}

.is-collapsible:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  z-index: 1;
}

.group-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.group-chevron {
  transition: transform 200ms var(--ease-out-expo);
  color: var(--ink-400);
}

.group-icon {
  color: var(--ink-500);
}

.group-label {
  font-weight: 600;
}

.group-count {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-400);
  background: var(--surface-0);
  padding: 2px 7px;
  border-radius: 12px;
  border: 1px solid var(--line);
}
</style>
