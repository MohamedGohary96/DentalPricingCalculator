/**
 * useFormValidation — reactive form validation composable
 *
 * Usage:
 *   import { useFormValidation } from '@/composables/useFormValidation'
 *
 *   const schema = {
 *     name:   { required: true, minLength: 2, maxLength: 80 },
 *     email:  { required: true, email: true },
 *     price:  { required: true, min: 0, max: 100000 },
 *     notes:  { maxLength: 500 },
 *   }
 *
 *   const { values, errors, touched, validate, isValid, touch, reset } =
 *     useFormValidation(schema)
 *
 * i18n error keys live under the "validation" namespace.
 * Fallback strings are shown if the i18n store hasn't loaded.
 */

import { reactive, computed } from 'vue'
import { useI18nStore } from '@/stores/i18n'

// ── Validator registry ────────────────────────────────────────────
// Each rule: (value, ruleArg, fieldKey) → i18n key | null (pass)
const VALIDATORS = {
  required(value) {
    const v = typeof value === 'string' ? value.trim() : value
    if (v === null || v === undefined || v === '' || v === false) {
      return 'validation.required'
    }
    return null
  },

  minLength(value, min) {
    const len = String(value ?? '').trim().length
    if (len > 0 && len < min) return 'validation.minLength'
    return null
  },

  maxLength(value, max) {
    const len = String(value ?? '').length
    if (len > max) return 'validation.maxLength'
    return null
  },

  min(value, minVal) {
    const num = Number(value)
    if (!isNaN(num) && num < minVal) return 'validation.min'
    return null
  },

  max(value, maxVal) {
    const num = Number(value)
    if (!isNaN(num) && num > maxVal) return 'validation.max'
    return null
  },

  email(value) {
    if (!value) return null
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!re.test(String(value).trim())) return 'validation.email'
    return null
  },

  pattern(value, regex) {
    if (!value) return null
    const re = regex instanceof RegExp ? regex : new RegExp(regex)
    if (!re.test(String(value))) return 'validation.pattern'
    return null
  },

  numeric(value) {
    if (!value && value !== 0) return null
    if (isNaN(Number(value))) return 'validation.numeric'
    return null
  },
}

// Rule execution order: required first, then the rest
const RULE_ORDER = ['required', 'email', 'numeric', 'minLength', 'maxLength', 'min', 'max', 'pattern']

/**
 * @param {Record<string, Object>} schema  — field → rules map
 * @param {Record<string, any>}    [initialValues]
 */
export function useFormValidation(schema, initialValues = {}) {
  const i18n = useI18nStore()

  // Build initial values from schema keys + any provided defaults
  const _buildInitial = () =>
    Object.fromEntries(
      Object.keys(schema).map(k => [k, initialValues[k] ?? ''])
    )

  const values  = reactive(_buildInitial())
  const errors  = reactive({})
  const touched = reactive({})

  // ── Single-field validation ─────────────────────────────────────
  function validate(field) {
    const rules = schema[field]
    if (!rules) return true

    const value = values[field]

    for (const ruleName of RULE_ORDER) {
      if (!(ruleName in rules)) continue

      const ruleArg  = rules[ruleName]
      const fn       = VALIDATORS[ruleName]
      if (!fn) continue

      // For boolean rules like `required: true` only run when truthy
      if (typeof ruleArg === 'boolean' && !ruleArg) continue

      const errKey = fn(value, ruleArg, field)
      if (errKey) {
        errors[field] = i18n.t(errKey)
        return false
      }
    }

    // Custom validator function — schema.field.validator(value) → string|null
    if (typeof rules.validator === 'function') {
      const msg = rules.validator(value)
      if (msg) {
        errors[field] = typeof msg === 'string' ? msg : i18n.t(msg)
        return false
      }
    }

    errors[field] = ''
    return true
  }

  // Validate every field, return overall pass/fail
  function validateAll() {
    let allValid = true
    for (const field of Object.keys(schema)) {
      touched[field] = true
      if (!validate(field)) allValid = false
    }
    return allValid
  }

  // ── Touch ───────────────────────────────────────────────────────
  // Call on @blur so errors only surface after the user leaves a field
  function touch(field) {
    touched[field] = true
    validate(field)
  }

  // ── isValid ─────────────────────────────────────────────────────
  // Computed — true only when every schema field passes silently
  const isValid = computed(() =>
    Object.keys(schema).every(field => {
      const rules = schema[field]
      if (!rules) return true
      const value = values[field]

      for (const ruleName of RULE_ORDER) {
        if (!(ruleName in rules)) continue
        const ruleArg = rules[ruleName]
        const fn      = VALIDATORS[ruleName]
        if (!fn) continue
        if (typeof ruleArg === 'boolean' && !ruleArg) continue
        if (fn(value, ruleArg, field)) return false
      }

      if (typeof rules.validator === 'function') {
        if (rules.validator(value)) return false
      }

      return true
    })
  )

  // ── Reset ───────────────────────────────────────────────────────
  function reset(newValues = {}) {
    const fresh = _buildInitial()
    for (const k of Object.keys(schema)) {
      values[k]  = newValues[k] ?? fresh[k]
      errors[k]  = ''
      touched[k] = false
    }
  }

  // ── Set values programmatically ──────────────────────────────────
  function setValues(incoming) {
    for (const [k, v] of Object.entries(incoming)) {
      if (k in values) values[k] = v
    }
  }

  return {
    values,
    errors,
    touched,
    validate,
    validateAll,
    isValid,
    touch,
    reset,
    setValues,
  }
}
