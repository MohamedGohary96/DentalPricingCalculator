/**
 * useMonthlyNudge — shows a soft pricing-review nudge once per calendar month.
 *
 * Storage keys:
 *   'dpc_last_nudge'        → 'YYYY-MM'  (dismissed month)
 *   'dpc_last_health_score' → number     (score at last review)
 */
import { ref, computed } from 'vue'

export function useMonthlyNudge() {
  const _currentMonth = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const shouldShowNudge = ref(false)

  function check() {
    const stored = localStorage.getItem('dpc_last_nudge') || ''
    shouldShowNudge.value = stored !== _currentMonth()
  }

  function dismissNudge() {
    localStorage.setItem('dpc_last_nudge', _currentMonth())
    shouldShowNudge.value = false
  }

  function saveHealthScore(score) {
    localStorage.setItem('dpc_last_health_score', String(score))
  }

  function getStoredHealthScore() {
    return parseInt(localStorage.getItem('dpc_last_health_score') || '0', 10)
  }

  // Run check immediately on composable init
  check()

  return { shouldShowNudge, dismissNudge, check, saveHealthScore, getStoredHealthScore }
}
