<script setup>
/**
 * ToastContainer — renders the toast stack in the bottom-right corner.
 * Place once in App.vue, outside the router-view, at the root level.
 *
 * <ToastContainer /> — that's all.
 *
 * Toasts animate in/out independently via DpcToast's own transition logic.
 * We use a TransitionGroup here solely to stagger the list layout changes
 * (vertical shuffle when a toast is removed), NOT for entry/exit animation —
 * DpcToast owns its own CSS transition.
 */

import { useToast } from '@/composables/useToast'
import DpcToast from './DpcToast.vue'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-label="Notifications" role="region">
      <TransitionGroup name="toast-stack" tag="div" class="toast-stack">
        <DpcToast
          v-for="toast in toasts"
          :key="toast.id"
          :id="toast.id"
          :message="toast.message"
          :type="toast.type"
          :action="toast.action"
          :visible="toast.visible"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  inset-inline-end: 24px;
  z-index: var(--z-toast, 60);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

/* TransitionGroup list-item reordering only (layout shift, not entry/exit) */
.toast-stack-move {
  transition: transform var(--transition-base, 200ms ease);
}

/* Mobile — full width at bottom */
@media (max-width: 480px) {
  .toast-container {
    bottom: 16px;
    inset-inline-start: 16px;
    inset-inline-end: 16px;
    align-items: stretch;
  }

  .toast-stack {
    align-items: stretch;
  }
}
</style>
