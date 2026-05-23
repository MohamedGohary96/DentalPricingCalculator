<script setup>
/**
 * DpcEmptyState — zero-data placeholder
 *
 * Usage (basic):
 *   <DpcEmptyState
 *     icon="Package"
 *     title="No services yet"
 *     description="Add your first service to get started."
 *     action-text="Add service"
 *     :action-to="{ name: 'services-new' }"
 *   />
 *
 * Usage (custom icon slot):
 *   <DpcEmptyState title="No results">
 *     <template #icon>
 *       <img src="/empty-search.svg" alt="" />
 *     </template>
 *     <template #action>
 *       <DpcBtn @click="clearFilters">Clear filters</DpcBtn>
 *     </template>
 *   </DpcEmptyState>
 *
 * The icon floats with a 3s ease-in-out loop (keyframes in animations.css).
 */

import { useRouter } from 'vue-router'
import DpcIcon from './DpcIcon.vue'
import DpcBtn  from './DpcBtn.vue'

const props = defineProps({
  /** Lucide icon name */
  icon:        { type: String, default: 'Package' },
  title:       { type: String, default: ''        },
  description: { type: String, default: ''        },
  actionText:  { type: String, default: ''        },
  /** vue-router location object or string */
  actionTo:    { type: [String, Object], default: null },
})

const emit = defineEmits(['action'])

const router = useRouter()

function handleAction() {
  if (props.actionTo) {
    router.push(props.actionTo)
  } else {
    emit('action')
  }
}
</script>

<template>
  <div class="empty-state">
    <!-- Icon -->
    <div class="empty-state__icon-wrap">
      <slot name="icon">
        <span class="empty-state__icon-float">
          <DpcIcon :name="icon" :size="40" :stroke-width="1.4" />
        </span>
      </slot>
    </div>

    <!-- Text -->
    <h3 v-if="title" class="empty-state__title">{{ title }}</h3>
    <p  v-if="description" class="empty-state__description">{{ description }}</p>

    <!-- Action -->
    <div v-if="actionText || $slots.action" class="empty-state__action">
      <slot name="action">
        <DpcBtn variant="teal" @click="handleAction">
          {{ actionText }}
        </DpcBtn>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-12, 48px) var(--space-6, 24px);
  gap: var(--space-3, 12px);
}

/* ── Icon wrapper ───────────────────────────────────────────────── */
.empty-state__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: var(--radius-xl, 24px);
  background: var(--paper-2, #f5f4ee);
  box-shadow: inset 0 0 0 1px var(--line, #e7e5e0);
  color: var(--ink-400, #94a3b8);
  margin-bottom: var(--space-2, 8px);
}

/* Float animation — @keyframes float is in animations.css */
.empty-state__icon-float {
  display: flex;
  animation: float 3s ease-in-out infinite;
}

/* ── Text ───────────────────────────────────────────────────────── */
.empty-state__title {
  font-family: var(--font-head, 'Poppins', sans-serif);
  font-size: var(--text-lg, 1.125rem);
  font-weight: var(--font-semibold, 600);
  color: var(--ink-900, #0a1424);
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0;
}

.empty-state__description {
  font-size: var(--text-sm, 0.8125rem);
  color: var(--ink-500, #6b7a90);
  line-height: 1.6;
  max-width: 340px;
  margin: 0;
}

/* ── Action ─────────────────────────────────────────────────────── */
.empty-state__action {
  margin-top: var(--space-2, 8px);
}
</style>
