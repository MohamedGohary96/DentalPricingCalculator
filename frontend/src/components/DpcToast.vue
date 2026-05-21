<script setup>
/**
 * DpcToast — single toast item
 *
 * Rendered by ToastContainer; do not place directly in templates.
 * Transition is driven by a single CSS `transition` on the host element
 * (NOT animation + transition together — they conflict on the same property).
 *
 * Entry:  translateX(110%) opacity(0) → translateX(0) opacity(1)
 * Exit:   translateX(110%) opacity(0)
 * Easing: spring cubic-bezier(0.34, 1.56, 0.64, 1) on transform (entry)
 *         standard ease on exit
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  id:       { type: Number,  required: true },
  message:  { type: String,  required: true },
  type:     {
    type:      String,
    default:   'info',
    validator: v => ['success', 'error', 'warning', 'info'].includes(v),
  },
  /** action: { text: string, onClick: Function } */
  action:   { type: Object,  default: null },
  /** visible is the reactive flag driving the CSS transition */
  visible:  { type: Boolean, default: true },
})

const { dismissToast, removeToast } = useToast()

// ── Transition state ─────────────────────────────────────────────
// We use a local `shown` ref toggled with nextTick so the browser
// paints the initial translateX(110%) state before we switch to
// translateX(0). This avoids the "no animation on first render" trap.
const shown = ref(false)

onMounted(() => {
  // One rAF gives the browser a frame to apply the base styles
  requestAnimationFrame(() => { shown.value = true })
})

// Watch for external dismiss (visible → false)
watch(
  () => props.visible,
  v => { if (!v) shown.value = false }
)

function handleTransitionEnd() {
  // Once the exit transition finishes, fully remove from DOM
  if (!shown.value) removeToast(props.id)
}

function dismiss() {
  dismissToast(props.id)
}

function handleAction() {
  if (props.action?.onClick) props.action.onClick()
  dismiss()
}

// ── Icon map ─────────────────────────────────────────────────────
const ICON_MAP = {
  success: 'CheckCircle2',
  error:   'XCircle',
  warning: 'AlertTriangle',
  info:    'Info',
}

const iconName = computed(() => ICON_MAP[props.type] ?? 'Info')
</script>

<template>
  <div
    :class="['toast', `toast--${type}`, shown && 'toast--shown']"
    role="alert"
    aria-live="polite"
    aria-atomic="true"
    @transitionend="handleTransitionEnd"
  >
    <!-- Type icon -->
    <span class="toast__icon" aria-hidden="true">
      <DpcIcon :name="iconName" :size="17" :stroke-width="2" />
    </span>

    <!-- Message -->
    <p class="toast__message">{{ message }}</p>

    <!-- Optional action button -->
    <button
      v-if="action"
      class="toast__action"
      type="button"
      @click="handleAction"
    >
      {{ action.text }}
    </button>

    <!-- Dismiss button -->
    <button
      class="toast__close"
      type="button"
      :aria-label="'Dismiss notification'"
      @click="dismiss"
    >
      <DpcIcon name="X" :size="14" :stroke-width="2.2" />
    </button>
  </div>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────────────────────── */
.toast {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  min-width: 280px;
  max-width: 420px;
  padding: 12px 14px;
  border-radius: var(--radius-md, 14px);
  background: var(--ink-900, #0a1424);
  color: #fff;
  box-shadow: var(--shadow-lg);
  pointer-events: all;
  will-change: transform, opacity;

  /*
   * SINGLE transition block — mixing animation + transition on the
   * same properties causes flicker; we use only `transition` here.
   * Entry uses the spring easing; exit falls back to standard ease.
   */
  transition:
    transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity   250ms ease;

  /* Initial (hidden) state — off-screen to the right */
  transform: translateX(110%);
  opacity: 0;
}

/* Shown state — triggered via shown ref after first rAF */
.toast--shown {
  transform: translateX(0);
  opacity: 1;
  /* Re-declare so the exit transition (triggered by removing .toast--shown)
     uses a quicker, non-spring ease. CSS reads the transition from the
     *current* state, so removing .toast--shown while it's applied means the
     browser uses the transition declared on .toast (above), which already
     covers exit via the fall-through. We override here for a tighter exit: */
  transition:
    transform 200ms ease,
    opacity   200ms ease;
}

/* ── Semantic colour strips ─────────────────────────────────────── */
.toast::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  top: 20%;
  bottom: 20%;
  width: 3px;
  border-radius: 999px;
}

.toast { position: relative; overflow: hidden; }

.toast--success::before { background: var(--success-600, #059669); }
.toast--error::before   { background: var(--danger-600,  #dc2626); }
.toast--warning::before { background: var(--warning-600, #d97706); }
.toast--info::before    { background: var(--info-600,    #2563eb); }

/* Subtle background tint */
.toast--success { background: #0d1f19; }
.toast--error   { background: #200d0d; }
.toast--warning { background: #1f1806; }
.toast--info    { background: #0a1327; }

/* ── Icon ───────────────────────────────────────────────────────── */
.toast__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.toast--success .toast__icon { color: var(--success-600, #059669); }
.toast--error   .toast__icon { color: var(--danger-600,  #dc2626); }
.toast--warning .toast__icon { color: var(--warning-600, #d97706); }
.toast--info    .toast__icon { color: var(--info-600,    #2563eb); }

/* ── Message ────────────────────────────────────────────────────── */
.toast__message {
  flex: 1;
  font-size: var(--text-sm, 0.8125rem);
  font-weight: var(--font-medium, 500);
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.92);
  padding-inline-start: 6px;
}

/* ── Action button ──────────────────────────────────────────────── */
.toast__action {
  flex-shrink: 0;
  font-size: var(--text-xs, 0.75rem);
  font-weight: var(--font-semibold, 600);
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-sm, 6px);
  padding: 4px 10px;
  cursor: pointer;
  transition: background var(--transition-fast, 150ms ease);
  white-space: nowrap;
}
.toast__action:hover { background: rgba(255, 255, 255, 0.20); }

/* ── Close button ───────────────────────────────────────────────── */
.toast__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm, 6px);
  color: rgba(255, 255, 255, 0.50);
  cursor: pointer;
  transition: color var(--transition-fast, 150ms ease), background var(--transition-fast, 150ms ease);
}
.toast__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.10);
}
</style>
