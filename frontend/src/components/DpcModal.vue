<script setup>
/**
 * DpcModal — accessible, animated modal dialog
 *
 * Usage:
 *   <DpcModal v-model="isOpen" title="Delete service" variant="danger"
 *             confirm-text="Delete" @confirm="handleDelete">
 *     <p>Are you sure you want to delete <strong>{{ service.name }}</strong>?</p>
 *   </DpcModal>
 *
 * - v-model controls open/close
 * - Backdrop click closes (unless persistent prop is set)
 * - Escape key closes; listener is attached on open, removed on close
 * - Focus is trapped inside the dialog while open
 * - window.confirm() is never used
 */

import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import DpcBtn from './DpcBtn.vue'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  modelValue:  { type: Boolean, default: false },
  title:       { type: String,  default: '' },
  confirmText: { type: String,  default: 'Confirm' },
  cancelText:  { type: String,  default: 'Cancel' },
  /**
   * 'default'  — neutral confirm dialog
   * 'confirm'  — positive action (teal confirm button)
   * 'danger'   — destructive action (red confirm button)
   */
  variant:     {
    type:      String,
    default:   'default',
    validator: v => ['default', 'confirm', 'danger'].includes(v),
  },
  /** Set true to prevent backdrop-click close */
  persistent:  { type: Boolean, default: false },
  /** Set false to hide the X button */
  closable:    { type: Boolean, default: true  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const dialogEl  = ref(null)
const shown     = ref(false)   // drives CSS transition (same pattern as DpcToast)

// ── Open / close helpers ─────────────────────────────────────────
function open() {
  document.addEventListener('keydown', handleKeyDown)
  nextTick(() => {
    shown.value = true
    trapFocus()
  })
}

function close() {
  shown.value = false
  document.removeEventListener('keydown', handleKeyDown)
}

function cancel() {
  close()
  emit('cancel')
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm')
  close()
  emit('update:modelValue', false)
}

// ── Watch modelValue ─────────────────────────────────────────────
watch(
  () => props.modelValue,
  v => { v ? open() : close() },
  { immediate: true }
)

// ── Keyboard handling ─────────────────────────────────────────────
function handleKeyDown(e) {
  if (e.key === 'Escape') { cancel(); return }
  if (e.key === 'Tab') handleTab(e)
}

// ── Focus trap ───────────────────────────────────────────────────
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function trapFocus() {
  nextTick(() => {
    if (!dialogEl.value) return
    const focusable = Array.from(dialogEl.value.querySelectorAll(FOCUSABLE))
    if (focusable.length) focusable[0].focus()
  })
}

function handleTab(e) {
  if (!dialogEl.value) return
  const focusable = Array.from(dialogEl.value.querySelectorAll(FOCUSABLE))
  if (!focusable.length) return

  const first = focusable[0]
  const last  = focusable[focusable.length - 1]

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function handleBackdropClick(e) {
  if (!props.persistent && e.target === e.currentTarget) cancel()
}

// ── Cleanup ──────────────────────────────────────────────────────
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// ── Confirm button variant ────────────────────────────────────────
const confirmBtnVariant = {
  default: 'primary',
  confirm: 'teal',
  danger:  'danger',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="modal-backdrop"
        :class="{ 'modal-backdrop--shown': shown }"
        role="presentation"
        @click="handleBackdropClick"
      >
        <Transition name="scale-pop">
          <div
            v-if="shown"
            ref="dialogEl"
            class="modal"
            :class="`modal--${variant}`"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? 'modal-title' : undefined"
          >
            <!-- Header -->
            <div class="modal__header">
              <h2 id="modal-title" class="modal__title">{{ title }}</h2>
              <button
                v-if="closable"
                class="modal__close"
                type="button"
                aria-label="Close dialog"
                @click="cancel"
              >
                <DpcIcon name="X" :size="16" :stroke-width="2" />
              </button>
            </div>

            <!-- Body -->
            <div class="modal__body">
              <slot />
            </div>

            <!-- Footer -->
            <div class="modal__footer">
              <DpcBtn
                variant="ghost"
                type="button"
                @click="cancel"
              >
                {{ cancelText }}
              </DpcBtn>
              <DpcBtn
                :variant="confirmBtnVariant[variant]"
                type="button"
                @click="confirm"
              >
                {{ confirmText }}
              </DpcBtn>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ───────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay, 40);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6, 24px);
  background: rgba(10, 20, 36, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

/* ── Dialog ─────────────────────────────────────────────────────── */
.modal {
  position: relative;
  z-index: var(--z-modal, 50);
  width: 100%;
  max-width: 480px;
  background: var(--surface, #fff);
  border-radius: var(--radius-lg, 18px);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  outline: none;
}

/* ── Header ─────────────────────────────────────────────────────── */
.modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4, 16px);
  padding: 22px 22px 0;
}

.modal__title {
  font-family: var(--font-head, 'Poppins', sans-serif);
  font-size: var(--text-lg, 1.125rem);
  font-weight: var(--font-semibold, 600);
  color: var(--ink-900, #0a1424);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.modal--danger .modal__title { color: var(--danger-600, #dc2626); }

.modal__close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm, 6px);
  color: var(--ink-500, #6b7a90);
  cursor: pointer;
  transition:
    background var(--transition-fast, 150ms ease),
    color var(--transition-fast, 150ms ease);
}
.modal__close:hover {
  background: var(--paper-2, #f5f4ee);
  color: var(--ink-900, #0a1424);
}

/* ── Body ───────────────────────────────────────────────────────── */
.modal__body {
  padding: 16px 22px 20px;
  font-size: var(--text-base, 0.9063rem);
  color: var(--ink-600, #475569);
  line-height: 1.6;
}

/* ── Footer ─────────────────────────────────────────────────────── */
.modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2, 8px);
  padding: 12px 22px 20px;
  border-top: 1px solid var(--line, #e7e5e0);
}

/* ── Variant accent bars ─────────────────────────────────────────── */
.modal--danger::before,
.modal--confirm::before {
  content: '';
  display: block;
  height: 3px;
  width: 100%;
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  border-radius: var(--radius-lg, 18px) var(--radius-lg, 18px) 0 0;
}
.modal--danger::before  { background: var(--danger-600,  #dc2626); }
.modal--confirm::before { background: var(--teal-600,    #0d9488); }

/* ── Transition classes (consumed from animations.css globals) ──── */
/* .fade-enter-active / .scale-pop-enter-active etc come from
   animations.css which is imported globally in main.js            */
</style>
