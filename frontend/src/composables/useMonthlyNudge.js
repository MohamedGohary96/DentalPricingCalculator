/**
 * useMonthlyNudge — shows pricing-review nudges based on EVENTS, not just calendar.
 *
 * Storage keys:
 *   'dpc_last_nudge'                → 'YYYY-MM'  (dismissed month - legacy)
 *   'dpc_last_health_score'         → number     (score at last review)
 *   'dpc_last_underpriced_count'    → number     (track changes)
 *   'dpc_last_costs_hash'           → string     (detect cost updates)
 */
import { ref, computed } from 'vue'

export function useMonthlyNudge() {
  const _currentMonth = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const shouldShowNudge = ref(false)
  const nudgeReason = ref('') // 'monthly' | 'underpriced' | 'costs_changed'

  function check() {
    const stored = localStorage.getItem('dpc_last_nudge') || ''
    if (stored !== _currentMonth()) {
      shouldShowNudge.value = true
      nudgeReason.value = 'monthly'
    }
  }

  function checkUnderpricedIncrease(currentCount) {
    const lastCount = parseInt(localStorage.getItem('dpc_last_underpriced_count') || '0')
    if (currentCount > lastCount && currentCount > 0) {
      shouldShowNudge.value = true
      nudgeReason.value = 'underpriced'
    }
    localStorage.setItem('dpc_last_underpriced_count', String(currentCount))
  }

  function checkCostsChanged(costsHash) {
    // costsHash = hash of (rent + salaries + depreciation)
    const lastHash = localStorage.getItem('dpc_last_costs_hash') || ''
    if (lastHash && lastHash !== costsHash) {
      shouldShowNudge.value = true
      nudgeReason.value = 'costs_changed'
    }
    localStorage.setItem('dpc_last_costs_hash', costsHash)
  }

  function dismissNudge() {
    localStorage.setItem('dpc_last_nudge', _currentMonth())
    shouldShowNudge.value = false
    nudgeReason.value = ''
  }

  function saveHealthScore(score) {
    localStorage.setItem('dpc_last_health_score', String(score))
  }

  function getStoredHealthScore() {
    return parseInt(localStorage.getItem('dpc_last_health_score') || '0', 10)
  }

  // Run check immediately on composable init
  check()

  return {
    shouldShowNudge,
    nudgeReason,
    dismissNudge,
    check,
    checkUnderpricedIncrease,
    checkCostsChanged,
    saveHealthScore,
    getStoredHealthScore,
  }
}
