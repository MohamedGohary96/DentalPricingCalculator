/**
 * errors.js — friendly error message mapper
 *
 * Usage:
 *   import { getFriendlyError } from '@/utils/errors'
 *   catch (err) {
 *     toast.showToast(getFriendlyError(err, 'saving service'), 'error')
 *   }
 *
 * All returned strings are i18n-resolved where possible.
 * Raw API error strings are NEVER exposed to the user.
 */

import { useI18nStore } from '@/stores/i18n'

// ── Pattern matchers ─────────────────────────────────────────────
// Order matters — more specific checks first.
const ERROR_MAP = [
  // Network / connectivity
  {
    test: err =>
      err instanceof TypeError &&
      (err.message.includes('Failed to fetch') ||
       err.message.includes('NetworkError') ||
       err.message.includes('Network request failed')),
    key: 'errors.network',
  },

  // Explicit HTTP status codes
  { test: err => _status(err) === 401, key: 'errors.unauthorized'    },
  { test: err => _status(err) === 403, key: 'errors.forbidden'       },
  { test: err => _status(err) === 404, key: 'errors.notFound'        },
  { test: err => _status(err) === 409, key: 'errors.conflict'        },
  { test: err => _status(err) === 422, key: 'errors.validation'      },
  { test: err => _status(err) === 429, key: 'errors.rateLimit'       },
  { test: err => _status(err) >= 500,  key: 'errors.serverError'     },

  // Database / API constraint messages (from response body)
  {
    test: err => _bodyIncludes(err, ['unique constraint', 'duplicate', 'already exists', 'UNIQUE']),
    key:  'errors.duplicateRecord',
  },
  {
    test: err => _bodyIncludes(err, ['not-null constraint', 'NOT NULL', 'null value', 'violates not-null']),
    key:  'errors.missingRequired',
  },
  {
    test: err => _bodyIncludes(err, ['foreign key constraint', 'FOREIGN KEY', 'referenced', 'violates foreign key']),
    key:  'errors.referencedRecord',
  },
  {
    test: err => _bodyIncludes(err, ['permission denied', 'insufficient privileges']),
    key:  'errors.permissionDenied',
  },
  {
    test: err => _bodyIncludes(err, ['token', 'jwt', 'expired', 'invalid signature']),
    key:  'errors.sessionExpired',
  },

  // Timeout
  {
    test: err => err.name === 'AbortError' || _bodyIncludes(err, ['timeout', 'timed out']),
    key:  'errors.timeout',
  },
]

// ── Helpers ──────────────────────────────────────────────────────

function _status(err) {
  return (
    err?.status ??
    err?.response?.status ??
    err?.statusCode ??
    null
  )
}

function _bodyIncludes(err, needles) {
  const haystack = [
    err?.message,
    err?.detail,
    err?.body,
    err?.response?.data?.detail,
    err?.response?.data?.message,
    err?.response?.data?.error,
    JSON.stringify(err?.response?.data ?? ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return needles.some(n => haystack.includes(n.toLowerCase()))
}

// ── Public API ───────────────────────────────────────────────────

/**
 * getFriendlyError(err, context?) → localised, safe string
 *
 * @param {unknown}  err      — caught value (Error, Response, plain object…)
 * @param {string}   context  — human-readable operation name, e.g. "saving service"
 *                              Used to build a contextual fallback message.
 * @returns {string}
 */
export function getFriendlyError(err, context = '') {
  // Attempt to get the i18n store — may not be initialised in unit tests
  let t
  try {
    t = useI18nStore().t
  } catch {
    t = key => key
  }

  for (const { test, key } of ERROR_MAP) {
    try {
      if (test(err)) return t(key)
    } catch {
      // ignore test errors
    }
  }

  // Context-aware generic fallback
  const fallbackKey = context
    ? 'errors.genericWithContext'
    : 'errors.generic'

  const msg = t(fallbackKey)

  // If i18n hasn't loaded, produce a readable fallback ourselves
  if (msg === fallbackKey) {
    return context
      ? `Something went wrong while ${context}. Please try again.`
      : 'Something went wrong. Please try again.'
  }

  // The i18n string may use a {context} placeholder
  return msg.replace('{context}', context)
}

/**
 * isAuthError(err) → boolean
 * Convenience helper — callers can redirect to login on true.
 */
export function isAuthError(err) {
  return _status(err) === 401 ||
    _bodyIncludes(err, ['token', 'jwt', 'expired', 'unauthorized', 'not authenticated'])
}

/**
 * isNetworkError(err) → boolean
 */
export function isNetworkError(err) {
  return (
    err instanceof TypeError &&
    (err.message.includes('Failed to fetch') ||
     err.message.includes('NetworkError') ||
     err.message.includes('Network request failed'))
  )
}
