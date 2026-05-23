<script setup>
/**
 * DpcBtn — Premium button component with variants, sizes, icons, and loading states
 *
 * Usage:
 *   <DpcBtn variant="primary">Click me</DpcBtn>
 *   <DpcBtn variant="teal" icon="Plus" :loading="saving">Save</DpcBtn>
 *   <DpcBtn variant="ghost" size="xs" square icon="Trash2" aria-label="Delete" />
 */
import { computed, useSlots } from 'vue'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  // Variant
  variant: {
    type: String,
    default: 'primary',
    validator: v => ['primary', 'accent', 'teal', 'secondary', 'outline', 'ghost', 'danger', 'link'].includes(v)
  },

  // Size
  size: {
    type: String,
    default: 'md',
    validator: v => ['xs', 'sm', 'md', 'lg'].includes(v)
  },

  // Type
  type: { type: String, default: 'button' },

  // States
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },

  // Layout
  full: { type: Boolean, default: false },
  square: { type: Boolean, default: false },

  // Icons
  icon: { type: String, default: '' },
  trailingIcon: { type: String, default: '' },

  // Link rendering
  href: { type: String, default: '' },
  to: { type: [String, Object], default: null },

  // Accessibility
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['click'])
const slots = useSlots()

const isIconOnly = computed(() => {
  return props.square && (props.icon || props.trailingIcon) && !slots.default
})

const iconSizes = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
}

const componentType = computed(() => {
  if (props.href) return 'a'
  if (props.to) return 'router-link'
  return 'button'
})

function handleClick(event) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <component
    :is="componentType"
    :type="componentType === 'button' ? type : undefined"
    :href="href || undefined"
    :to="to"
    :disabled="disabled || loading"
    :aria-label="ariaLabel || (isIconOnly ? (icon || trailingIcon) : undefined)"
    :class="[
      'dpc-btn',
      `dpc-btn--${variant}`,
      `dpc-btn--${size}`,
      {
        'dpc-btn--full': full,
        'dpc-btn--square': isIconOnly,
        'dpc-btn--loading': loading,
      }
    ]"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <span v-if="loading" class="dpc-btn__spinner">
      <DpcIcon name="RefreshCw" :size="iconSizes[size]" :stroke-width="1.8" />
    </span>

    <!-- Leading icon -->
    <DpcIcon
      v-if="icon && !loading"
      :name="icon"
      :size="iconSizes[size]"
      :stroke-width="1.8"
      class="dpc-btn__icon dpc-btn__icon--leading"
    />

    <!-- Button text -->
    <span v-if="!isIconOnly" class="dpc-btn__text">
      <slot />
    </span>

    <!-- Trailing icon -->
    <DpcIcon
      v-if="trailingIcon && !loading"
      :name="trailingIcon"
      :size="iconSizes[size]"
      :stroke-width="1.8"
      class="dpc-btn__icon dpc-btn__icon--trailing"
    />
  </component>
</template>

<style scoped>
/* ──────────────────────────────────────────────────────────────
   BASE BUTTON STYLES
   ────────────────────────────────────────────────────────────── */

.dpc-btn {
  /* Reset */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  cursor: pointer;
  text-decoration: none;

  /* Typography */
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  line-height: 1;

  /* Transitions */
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1),
    background 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    opacity 200ms ease;
}

/* Disabled state */
.dpc-btn:disabled,
.dpc-btn--loading {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.dpc-btn--loading {
  cursor: wait;
  opacity: 0.7;
}

/* Active state — tactile snap */
.dpc-btn:active:not(:disabled):not(.dpc-btn--loading) {
  transform: scale(0.98);
  transition-duration: 50ms;
}

/* Full width */
.dpc-btn--full {
  width: 100%;
}

/* Icon-only square */
.dpc-btn--square {
  padding: 0;
  aspect-ratio: 1;
}

/* Loading spinner */
.dpc-btn__spinner {
  display: inline-flex;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Icon spacing */
.dpc-btn__icon--leading {
  margin-inline-end: 0;
}

.dpc-btn__icon--trailing {
  margin-inline-start: 0;
}

/* ──────────────────────────────────────────────────────────────
   SIZE VARIANTS
   ────────────────────────────────────────────────────────────── */

.dpc-btn--xs {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 7px;
}
.dpc-btn--xs.dpc-btn--square { width: 28px; }

.dpc-btn--sm {
  height: 36px;
  padding: 0 14px;
  font-size: 13px;
  border-radius: 8px;
}
.dpc-btn--sm.dpc-btn--square { width: 36px; }

.dpc-btn--md {
  height: 40px;
  padding: 0 18px;
  font-size: 13.5px;
  border-radius: 10px;
}
.dpc-btn--md.dpc-btn--square { width: 40px; }

.dpc-btn--lg {
  height: 48px;
  padding: 0 24px;
  font-size: 14.5px;
  border-radius: 12px;
}
.dpc-btn--lg.dpc-btn--square { width: 48px; }

/* ──────────────────────────────────────────────────────────────
   VARIANT STYLES
   ────────────────────────────────────────────────────────────── */

/* PRIMARY — dark background, white text, main CTAs */
.dpc-btn--primary {
  background: var(--ink-900);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.dpc-btn--primary:hover:not(:disabled):not(.dpc-btn--loading) {
  background: var(--ink-800);
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 4px 16px rgba(10, 20, 36, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* ACCENT / TEAL — signature cyan, high-emphasis CTAs */
.dpc-btn--accent,
.dpc-btn--teal {
  background: var(--accent);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.dpc-btn--accent:hover:not(:disabled):not(.dpc-btn--loading),
.dpc-btn--teal:hover:not(:disabled):not(.dpc-btn--loading) {
  background: var(--accent-dark);
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 6px 20px rgba(6, 182, 212, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* SECONDARY — outline style, supporting actions */
.dpc-btn--secondary,
.dpc-btn--outline {
  background: var(--surface-1);
  color: var(--ink-700);
  box-shadow: inset 0 0 0 1px var(--line), var(--shadow-xs);
}
.dpc-btn--secondary:hover:not(:disabled):not(.dpc-btn--loading),
.dpc-btn--outline:hover:not(:disabled):not(.dpc-btn--loading) {
  box-shadow: inset 0 0 0 1px var(--accent), 0 1px 3px rgba(6, 182, 212, 0.1);
  color: var(--accent-dark);
  background: var(--surface-1);
}

/* GHOST — transparent, tertiary actions */
.dpc-btn--ghost {
  background: transparent;
  color: var(--ink-700);
}
.dpc-btn--ghost:hover:not(:disabled):not(.dpc-btn--loading) {
  background: var(--surface-2);
  color: var(--ink-900);
}

/* DANGER — red, destructive actions */
.dpc-btn--danger {
  background: var(--danger-600);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
}
.dpc-btn--danger:hover:not(:disabled):not(.dpc-btn--loading) {
  background: var(--danger-700);
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
}

/* LINK — text-only, navigation */
.dpc-btn--link {
  background: transparent;
  color: var(--accent-dark);
  padding: 0;
  height: auto;
  min-height: 0;
  font-weight: 500;
}
.dpc-btn--link:hover:not(:disabled):not(.dpc-btn--loading) {
  text-decoration: underline;
  color: var(--accent);
}

/* ──────────────────────────────────────────────────────────────
   RTL SUPPORT
   ────────────────────────────────────────────────────────────── */

html[dir="rtl"] .dpc-btn__icon--leading {
  order: 2;
}

html[dir="rtl"] .dpc-btn__icon--trailing {
  order: 0;
}

/* ──────────────────────────────────────────────────────────────
   REDUCED MOTION
   ────────────────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .dpc-btn {
    transition-duration: 0.01ms !important;
  }
  .dpc-btn__spinner {
    animation: none !important;
  }
}
</style>
