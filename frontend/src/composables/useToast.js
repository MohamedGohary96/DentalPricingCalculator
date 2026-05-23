/**
 * useToast — global toast notification composable
 *
 * Usage (in any component):
 *   import { useToast } from '@/composables/useToast'
 *   const { showToast } = useToast()
 *   showToast('Saved!', 'success')
 *   showToast('Something went wrong', 'error', { action: { text: 'Retry', onClick: retry } })
 *
 * The ToastContainer component must be rendered once in App.vue:
 *   <ToastContainer />
 */

import { reactive } from 'vue'

// Default auto-dismiss durations per type (ms)
const DEFAULT_DURATIONS = {
  error:   6000,
  warning: 5000,
  success: 2500,
  info:    3500,
}

// Singleton state — shared across all composable instances
const toasts = reactive([])
let nextId = 1

/**
 * @param {string}  message           Display text
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {Object}  [options]
 * @param {number}  [options.duration] Override auto-dismiss ms (0 = persistent)
 * @param {{text: string, onClick: Function}} [options.action]  Action button
 */
function showToast(message, type = 'info', options = {}) {
  const id       = nextId++
  const duration = options.duration ?? DEFAULT_DURATIONS[type] ?? DEFAULT_DURATIONS.info

  const toast = {
    id,
    message,
    type,
    action:  options.action ?? null,
    visible: true,
    timerId: null,
  }

  toasts.push(toast)

  if (duration > 0) {
    toast.timerId = setTimeout(() => dismissToast(id), duration)
  }

  return id
}

function dismissToast(id) {
  const idx = toasts.findIndex(t => t.id === id)
  if (idx === -1) return

  const toast = toasts[idx]
  if (toast.timerId) {
    clearTimeout(toast.timerId)
    toast.timerId = null
  }
  // Mark invisible — the component drives the CSS transition,
  // then calls removeToast once the transition ends.
  toast.visible = false
}

function removeToast(id) {
  const idx = toasts.findIndex(t => t.id === id)
  if (idx !== -1) toasts.splice(idx, 1)
}

export function useToast() {
  return { toasts, showToast, dismissToast, removeToast }
}
