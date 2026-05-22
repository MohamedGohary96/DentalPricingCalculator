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

// Badge metadata — labels only (no description leakage before unlock)
const BADGE_META = {
  clinic_configured: {
    icon: '🏥',
    labelEn: 'Clinic Ready',
    labelAr: 'عيادة مُجهَّزة',
    descEn: 'Completed onboarding setup',
    descAr: 'أكملت إعداد العيادة',
  },
  first_price: {
    icon: '💰',
    labelEn: 'First Price',
    labelAr: 'أول سعر',
    descEn: 'Configured your first service',
    descAr: 'أعددت أول خدمة',
  },
  full_coverage: {
    icon: '✅',
    labelEn: 'Full Coverage',
    labelAr: 'تغطية كاملة',
    descEn: 'All services have market prices',
    descAr: 'جميع الخدمات لها أسعار سوقية',
  },
  priced_right: {
    icon: '🎯',
    labelEn: 'Priced Right',
    labelAr: 'تسعير صحيح',
    descEn: 'First service priced at or above its calculated cost',
    descAr: 'أول خدمة بسعر صحيح أو أعلى من التكلفة المحسوبة',
  },
  supply_chain: {
    icon: '📦',
    labelEn: 'Supply Chain',
    labelAr: 'سلسلة التوريد',
    descEn: '10+ consumables configured',
    descAr: 'أضفت أكثر من ١٠ مستهلكات',
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
      const raw = localStorage.getItem(_storageKey())
      if (raw) _state.value = JSON.parse(raw)
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
   * checkAchievements(stats)
   * Call after loading /api/dashboard/stats.
   * Also passes consumablesCount separately for supply_chain.
   */
  async function checkAchievements(stats, consumablesCount = null) {
    _load()

    const onboarding  = auth.user?.onboarding_completed === 1 || auth.user?.onboarding_completed === true
    const totalSvcs   = stats?.total_services || 0
    const setSvcs     = stats?.set_services   || 0
    const lowSvcs     = stats?.low_services   || 0
    const goodSvcs    = setSvcs - lowSvcs

    // clinic_configured
    if (onboarding) _unlock('clinic_configured')

    // first_price
    if (totalSvcs >= 1) _unlock('first_price')

    // full_coverage — all services have market prices set
    if (totalSvcs > 0 && setSvcs >= totalSvcs) _unlock('full_coverage')

    // priced_right — at least one service priced at or above its calculated cost
    if (goodSvcs >= 1) _unlock('priced_right')

    // supply_chain — 10+ consumables
    let cCount = consumablesCount
    if (cCount === null) {
      try {
        const { data } = await api.get('/api/consumables')
        cCount = Array.isArray(data) ? data.length : 0
      } catch {
        cCount = 0
      }
    }
    if (cCount >= 10) _unlock('supply_chain')
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

  // Eagerly load persisted state
  _load()

  return { achievements, checkAchievements, newlyUnlocked, clearNewlyUnlocked }
}
