<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | teal | ghost | outline | danger
  type:    { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled:{ type: Boolean, default: false },
  full:    { type: Boolean, default: false },
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="['dpc-btn', `dpc-btn-${variant}`, full && 'dpc-btn-full']"
  >
    <slot />
  </button>
</template>

<style scoped>
.dpc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  border-radius: var(--r);
  font-weight: 600;
  font-size: 14.5px;
  letter-spacing: -0.005em;
  transition: background .15s, transform .1s, box-shadow .15s, opacity .15s;
  white-space: nowrap;
  cursor: pointer;
  border: 0;
}
.dpc-btn:disabled { opacity: .55; cursor: not-allowed; }
.dpc-btn:active:not(:disabled) { transform: scale(.98); }
.dpc-btn-full { width: 100%; }

.dpc-btn-primary {
  background: var(--ink-900);
  color: #fff;
  box-shadow: 0 1px 0 rgba(255,255,255,.1) inset, var(--shadow-sm);
}
.dpc-btn-primary:hover:not(:disabled) { background: #000; }

.dpc-btn-teal {
  background: var(--teal-600);
  color: #fff;
  box-shadow: 0 1px 0 rgba(255,255,255,.18) inset, 0 6px 16px rgba(13,148,136,.22);
}
.dpc-btn-teal:hover:not(:disabled) { background: var(--teal-700); }

.dpc-btn-ghost {
  background: transparent;
  color: var(--ink-700);
}
.dpc-btn-ghost:hover:not(:disabled) { background: rgba(15,37,69,.05); }

.dpc-btn-outline {
  background: var(--surface);
  color: var(--ink-800);
  box-shadow: inset 0 0 0 1px var(--line);
}
.dpc-btn-outline:hover:not(:disabled) { box-shadow: inset 0 0 0 1px var(--ink-300); }

.dpc-btn-danger {
  background: var(--danger-600);
  color: #fff;
}
.dpc-btn-danger:hover:not(:disabled) { background: var(--danger-700); }
</style>
