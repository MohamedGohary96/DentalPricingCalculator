<script setup>
defineProps({
  label:        { type: String, default: '' },
  type:         { type: String, default: 'text' },
  modelValue:   { default: '' },
  placeholder:  { type: String, default: '' },
  icon:         { type: String, default: '' },   // Lucide name for leading icon
  hint:         { type: String, default: '' },
  error:        { type: String, default: '' },
  required:     { type: Boolean, default: false },
  disabled:     { type: Boolean, default: false },
  // Mobile keyboard hinting — passed straight through to <input>.
  inputmode:    { type: String, default: '' },
  autocomplete: { type: String, default: '' },
  pattern:      { type: String, default: '' },
  name:         { type: String, default: '' },
  // Accessibility — used so a label tied to a different element still
  // associates correctly. Falls back to a generated id when absent.
  id:           { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="field-wrap">
    <label v-if="label" class="dpc-field-label" :for="id || undefined">
      {{ label }}<span v-if="required" class="req"> *</span>
    </label>
    <div class="input-wrap">
      <span v-if="icon" class="field-icon">
        <DpcIcon :name="icon" :size="16" :stroke-width="1.6" />
      </span>
      <input
        :id="id || undefined"
        :name="name || undefined"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :inputmode="inputmode || undefined"
        :autocomplete="autocomplete || undefined"
        :pattern="pattern || undefined"
        :class="['dpc-field-input', icon && 'has-icon', error && 'has-error']"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>
    <p v-if="error" class="field-msg error">{{ error }}</p>
    <p v-else-if="hint" class="field-msg hint">{{ hint }}</p>
  </div>
</template>

<script>
import DpcIcon from './DpcIcon.vue'
export default { components: { DpcIcon } }
</script>

<style scoped>
.field-wrap { display: flex; flex-direction: column; gap: 0; }

.dpc-field-label {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-700);
  margin-bottom: 6px;
  letter-spacing: 0.01em;
}
.req { color: var(--danger-600); }

.input-wrap { position: relative; }

.field-icon {
  position: absolute;
  inset-inline-start: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-400);
  display: flex;
  pointer-events: none;
}

.dpc-field-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  background: var(--surface);
  border-radius: var(--r);
  box-shadow: inset 0 0 0 1px var(--line);
  color: var(--ink-900);
  font-size: 14.5px;
  transition: box-shadow .15s;
  outline: none;
  border: 0;
}

/* iOS Safari auto-zooms on focus if the input font-size is < 16px.
   Lift to 16px below the lg breakpoint where iPhone/iPad portrait live. */
@media (max-width: 1023px) {
  .dpc-field-input { font-size: 16px; }
}
.dpc-field-input::placeholder { color: var(--ink-400); }
.dpc-field-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600), 0 0 0 4px rgba(13,148,136,.12); }
.dpc-field-input.has-icon { padding-inline-start: 42px; }
.dpc-field-input.has-error { box-shadow: inset 0 0 0 1.5px var(--danger-600); }
.dpc-field-input:disabled { background: var(--paper-2); color: var(--ink-500); }

.field-msg { font-size: 12px; margin-top: 5px; }
.field-msg.error { color: var(--danger-600); }
.field-msg.hint  { color: var(--ink-500); }
</style>
