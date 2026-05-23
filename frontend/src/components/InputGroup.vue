<script setup>
import { computed } from 'vue'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  label: { type: String, required: true },
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  helperText: { type: String, default: '' },
  error: { type: String, default: '' },
  success: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  suffixIcon: { type: String, default: '' },
  maxLength: { type: Number, default: null },
  showCounter: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasError = computed(() => !!props.error)
const hasSuccess = computed(() => !!props.success && !hasError.value)

const characterCount = computed(() => {
  if (!props.showCounter || !props.maxLength) return ''
  const current = String(props.modelValue || '').length
  return `${current}/${props.maxLength}`
})
</script>

<template>
  <div class="input-group">
    <!-- Label -->
    <label class="input-label" :class="required && 'is-required'">
      {{ label }}
    </label>

    <!-- Input wrapper -->
    <div class="input-wrapper" :class="{
      'has-error': hasError,
      'has-success': hasSuccess,
      'is-disabled': disabled,
      'has-icon': icon,
      'has-suffix': suffixIcon
    }">
      <!-- Prefix icon -->
      <DpcIcon v-if="icon" :name="icon" :size="15" class="input-icon-prefix" />

      <!-- Input -->
      <input
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxLength"
        :required="required"
        class="input-field"
      />

      <!-- Suffix icon -->
      <DpcIcon v-if="suffixIcon" :name="suffixIcon" :size="15" class="input-icon-suffix" />

      <!-- Success icon -->
      <div v-if="hasSuccess" class="input-status-icon success">
        <DpcIcon name="Check" :size="14" :stroke-width="2.5" />
      </div>

      <!-- Error icon -->
      <div v-if="hasError" class="input-status-icon error">
        <DpcIcon name="AlertCircle" :size="14" :stroke-width="2.5" />
      </div>
    </div>

    <!-- Helper text / Error / Success / Counter -->
    <div class="input-footer">
      <div class="input-message">
        <span v-if="hasError" class="error-message">{{ error }}</span>
        <span v-else-if="hasSuccess" class="success-message">{{ success }}</span>
        <span v-else-if="helperText" class="helper-text">{{ helperText }}</span>
      </div>
      <span v-if="showCounter && maxLength" class="character-counter">{{ characterCount }}</span>
    </div>
  </div>
</template>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-700);
  letter-spacing: 0.01em;
  display: block;
}

.input-label.is-required::after {
  content: ' *';
  color: var(--danger-600);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1.5px solid var(--line);
  border-radius: var(--radius-md);
  font-size: 13.5px;
  background: var(--paper);
  color: var(--ink-900);
  font-family: inherit;
  transition: all var(--duration-fast);
  outline: none;
}

.input-wrapper.has-icon .input-field {
  padding-inline-start: 38px;
}

.input-wrapper.has-suffix .input-field {
  padding-inline-end: 38px;
}

.input-field::placeholder {
  color: var(--ink-300);
}

.input-field:hover:not(:disabled) {
  border-color: var(--ink-400);
}

.input-field:focus {
  border-color: var(--teal-600);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.input-field:disabled {
  background: var(--paper-2);
  color: var(--ink-400);
  cursor: not-allowed;
}

/* Icons */
.input-icon-prefix,
.input-icon-suffix {
  position: absolute;
  color: var(--ink-400);
  pointer-events: none;
  transition: color var(--duration-fast);
}

.input-icon-prefix {
  inset-inline-start: 12px;
}

.input-icon-suffix {
  inset-inline-end: 12px;
}

.input-field:focus ~ .input-icon-prefix,
.input-field:focus ~ .input-icon-suffix {
  color: var(--teal-600);
}

/* Status icons */
.input-status-icon {
  position: absolute;
  inset-inline-end: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  pointer-events: none;
  animation: scale-in 0.2s var(--ease-spring);
}

.input-status-icon.success {
  background: var(--success-50);
  color: var(--success-600);
}

.input-status-icon.error {
  background: var(--danger-50);
  color: var(--danger-600);
}

/* States */
.input-wrapper.has-error .input-field {
  border-color: var(--danger-500);
}

.input-wrapper.has-error .input-field:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input-wrapper.has-success .input-field {
  border-color: var(--success-500);
}

.input-wrapper.has-success .input-field:focus {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

/* Footer */
.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  min-height: 18px;
}

.input-message {
  flex: 1;
  font-size: 11.5px;
}

.helper-text {
  color: var(--ink-500);
}

.error-message {
  color: var(--danger-600);
  font-weight: 500;
}

.success-message {
  color: var(--success-600);
  font-weight: 500;
}

.character-counter {
  font-size: 11px;
  color: var(--ink-400);
  font-variant-numeric: tabular-nums;
}
</style>
