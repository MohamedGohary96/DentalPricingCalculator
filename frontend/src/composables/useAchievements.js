/**
 * useAchievements — derives achievement badges from API data + localStorage.
 *
 * Storage key: 'dpc_achievements_{clinicId}'
 * Each stored entry: { id, unlocked, unlockedAt }
 *
 * Achievements are NEVER locked back once unlocked.
 */
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const api = axios.create({ withCredentials: true })

// Badge metadata — outcome-based achievements (tied to business value)
const BADGE_META = {
  first_win: {
    icon: '🎯',
    labelEn: 'First Win',
    labelAr: 'أول نجاح',
    descEn: 'Added your first service with pricing',
    descAr: 'أضفت أول خدمة مع تسعير',
  },
  profit_protector: {
    icon: '🛡️',
    labelEn: 'Profit Protector',
    labelAr: 'حامي الأرباح',
    descEn: 'Fixed 5 underpriced services (saved money!)',
    descAr: 'عدّلت ٥ خدمات كانت أسعارها منخفضة',
  },
  cost_master: {
    icon: '📊',
    labelEn: 'Cost Master',
    labelAr: 'خبير التكاليف',
    descEn: 'Updated costs within 7 days of a change',
    descAr: 'حدّثت التكاليف خلال ٧ أيام من تغييرها',
  },
  monthly_reviewer: {
    icon: '📅',
    labelEn: 'Monthly Reviewer',
    labelAr: 'مراجع شهري',
    descEn: 'Reviewed prices 3 months in a row',
    descAr: 'راجعت الأسعار ٣ أشهر متتالية',
  },
  full_coverage: {
    icon: '✅',
    labelEn: 'Full Coverage',
    labelAr: 'تغطية كاملة',
    descEn: 'All services have market prices set',
    descAr: 'جميع الخدمات لها أسعار سوقية',
  },
  pricing_health_100: {
    icon: '💯',
    labelEn: 'Perfect Health',
    labelAr: 'صحة مثالية',
    descEn: 'Reached 100% pricing health score',
    descAr: 'وصلت إلى نتيجة صحة تسعير ١٠٠٪',
  },
}

export function useAchievements() {
  const auth = useAuthStore()
  const i18n = useI18nStore()

  const isAr = computed(() => i18n.locale === 'ar')

  // Internal reactive map: id → { unlocked, unlockedAt }
  const _state = ref({})
  const newlyUnlocked = ref(null)

  function _storageKey() {
    const clinicId = auth.user?.clinic_id || auth.user?.id || 'default'
    return `dpc_achievements_${clinicId}`
  }

  function _load() {
    try {
      const key = _storageKey()
      const raw = localStorage.getItem(key)
      if (raw) {
        _state.value = JSON.parse(raw)
      } else {
        // No data for this clinic — start fresh (prevents cross-account bleed)
        _state.value = {}
      }
    } catch {
      _state.value = {}
    }
  }

  function _save() {
    try {
      localStorage.setItem(_storageKey(), JSON.stringify(_state.value))
    } catch { /* quota exceeded — gracefully ignore */ }
  }

  function _unlock(id) {
    if (_state.value[id]?.unlocked) return // already unlocked, no re-trigger

    const entry = {
      unlocked: true,
      unlockedAt: new Date().toISOString(),
    }
    _state.value = { ..._state.value, [id]: entry }
    _save()

    const meta = BADGE_META[id]
    const label = isAr.value ? meta.labelAr : meta.labelEn
    newlyUnlocked.value = { id, label, icon: meta.icon }
  }

  /**
   * checkAchievements(stats, healthScore, pricedCount)
   * Call after loading /api/dashboard/stats and the price list.
   * pricedCount = number of services with current_price > 0 (from the price list).
   */
  async function checkAchievements(stats, healthScore = 0, pricedCount = 0) {
    _load()

    const totalSvcs      = stats?.total_services || 0
    const underpricedSvcs = stats?.underpriced_services || 0

    // first_win — first service with an actual price set by the user
    if (totalSvcs >= 1 && pricedCount >= 1) _unlock('first_win')

    // full_coverage — every service has a market price set
    if (totalSvcs > 0 && pricedCount >= totalSvcs) _unlock('full_coverage')

    // pricing_health_100 — perfect health requires real pricing work (≥2 services)
    if (healthScore >= 100 && totalSvcs >= 2 && pricedCount >= 2) _unlock('pricing_health_100')

    // profit_protector — fixed 5+ underpriced services (tracked via localStorage)
    // This gets incremented when user updates an underpriced service price
    const fixedKey = `${_storageKey()}_fixed_count`
    try {
      const totalFixed = parseInt(localStorage.getItem(fixedKey) || '0')
      if (totalFixed >= 5) _unlock('profit_protector')
    } catch { /* ignore */ }

    // cost_master & monthly_reviewer are tracked separately via timestamp-based logic
    // (would be implemented when settings are updated or monthly reviews happen)
  }

  /**
   * achievements — the full badge list with runtime state merged in.
   */
  const achievements = computed(() => {
    return Object.entries(BADGE_META).map(([id, meta]) => {
      const stored = _state.value[id] || {}
      return {
        id,
        icon:       meta.icon,
        label:      isAr.value ? meta.labelAr : meta.labelEn,
        labelEn:    meta.labelEn,
        labelAr:    meta.labelAr,
        desc:       isAr.value ? meta.descAr  : meta.descEn,
        unlocked:   stored.unlocked  || false,
        unlockedAt: stored.unlockedAt || null,
      }
    })
  })

  function clearNewlyUnlocked() {
    newlyUnlocked.value = null
  }

  /**
   * trackPriceFix() - Call when user updates an underpriced service
   * Increments the profit_protector counter
   */
  function trackPriceFix() {
    _load()
    const fixedKey = `${_storageKey()}_fixed_count`
    try {
      const current = parseInt(localStorage.getItem(fixedKey) || '0')
      const newCount = current + 1
      localStorage.setItem(fixedKey, String(newCount))

      // Check if we just unlocked profit_protector
      if (newCount >= 5) {
        _unlock('profit_protector')
      }
    } catch { /* ignore */ }
  }

  // Eagerly load persisted state
  _load()

  return {
    achievements,
    checkAchievements,
    trackPriceFix,
    newlyUnlocked,
    clearNewlyUnlocked,
  }
}
