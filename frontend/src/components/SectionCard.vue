<script setup>
import { ref } from 'vue'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  collapsible: { type: Boolean, default: false },
  defaultOpen: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  variant: { type: String, default: 'default', validator: v => ['default', 'bordered', 'elevated'].includes(v) }
})

const emit = defineEmits(['toggle'])

// Slots are automatically available via $slots in template

const isOpen = ref(props.defaultOpen)

function toggle() {
  if (!props.collapsible) return
  isOpen.value = !isOpen.value
  emit('toggle', isOpen.value)
}
</script>

<template>
  <div :class="['section-card', `section-card--${variant}`, loading && 'is-loading']">
    <!-- Header -->
    <div :class="['section-header', collapsible && 'is-collapsible']" @click="toggle">
      <div class="section-header-left">
        <!-- Icon -->
        <div v-if="icon" class="section-icon">
          <DpcIcon :name="icon" :size="16" :stroke-width="1.7" />
        </div>

        <!-- Title & Subtitle -->
        <div class="section-title-group">
          <h3 class="section-title">{{ title }}</h3>
          <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <!-- Right side: Actions + Collapse icon -->
      <div class="section-header-right">
        <div v-if="$slots.actions && !collapsible" class="section-actions" @click.stop>
          <slot name="actions" />
        </div>

        <button
          v-if="collapsible"
          class="collapse-btn"
          :aria-label="isOpen ? 'Collapse' : 'Expand'"
          :aria-expanded="isOpen"
        >
          <DpcIcon name="ChevronDown" :size="16" :stroke-width="2" :class="['collapse-icon', isOpen && 'is-open']" />
        </button>
      </div>
    </div>

    <!-- Content (collapsible) -->
    <Transition name="section-collapse">
      <div v-if="isOpen" class="section-body">
        <div v-if="loading" class="section-loading">
          <div class="shimmer" style="height: 100px; width: 100%; border-radius: var(--radius-md);" />
        </div>
        <slot v-else />
      </div>
    </Transition>

    <!-- Footer slot -->
    <div v-if="$slots.footer && isOpen" class="section-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.section-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--duration-fast);
}

.section-card--default {
  border: 1px solid var(--line);
}

.section-card--bordered {
  border: 1.5px solid var(--line);
}

.section-card--elevated {
  border: 1px solid var(--line);
  box-shadow: var(--shadow-md);
}

.section-card--elevated:hover {
  box-shadow: var(--shadow-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  gap: 16px;
  border-bottom: 1px solid var(--line-2);
  background: var(--paper-2);
  transition: background var(--duration-fast);
}

.section-header.is-collapsible {
  cursor: pointer;
  user-select: none;
}

.section-header.is-collapsible:hover {
  background: var(--paper-3);
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.section-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  flex: none;
  box-shadow: inset 0 0 0 1px var(--teal-100);
}

.section-title-group {
  flex: 1;
  min-width: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
  margin: 0;
  letter-spacing: -0.01em;
}

.section-subtitle {
  font-size: 12.5px;
  color: var(--ink-500);
  margin: 2px 0 0;
}

.section-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  color: var(--ink-500);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.collapse-btn:hover {
  background: var(--paper-2);
  color: var(--ink-900);
}

.collapse-icon {
  transition: transform var(--duration-base) var(--ease-spring);
}

.collapse-icon.is-open {
  transform: rotate(180deg);
}

.section-body {
  padding: 20px;
}

.section-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--line-2);
  background: var(--paper-2);
}

/* Collapse transition */
.section-collapse-enter-active,
.section-collapse-leave-active {
  transition: all var(--duration-base) var(--ease-spring);
  overflow: hidden;
}

.section-collapse-enter-from,
.section-collapse-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.section-collapse-enter-to,
.section-collapse-leave-from {
  max-height: 2000px;
  opacity: 1;
}

/* Loading state */
.section-loading {
  padding: 20px 0;
}
</style>
