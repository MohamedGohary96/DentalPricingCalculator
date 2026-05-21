<script setup>
import { computed } from 'vue'
import { RouterView }      from 'vue-router'
import DpcMonthlyNudge     from '@/components/DpcMonthlyNudge.vue'
import ToastContainer      from '@/components/ToastContainer.vue'
import { useAuthStore }    from '@/stores/auth.js'
import { usePricingStore } from '@/stores/pricing.js'
import { useMonthlyNudge } from '@/composables/useMonthlyNudge.js'

const auth         = useAuthStore()
const pricingStore = usePricingStore()
const { shouldShowNudge } = useMonthlyNudge()

// Only show when logged in AND onboarding is complete
const showNudge = computed(() =>
  shouldShowNudge.value
  && auth.isLoggedIn
  && (auth.user?.onboarding_completed === 1 || auth.user?.onboarding_completed === true)
)

// Pass current health score to the nudge component
const healthScore = computed(() => {
  const s = pricingStore.dashboardStats || {}
  const onboardingDone = auth.user?.onboarding_completed === 1 || auth.user?.onboarding_completed === true
  const total      = s.total_services       || 0
  const underpriced = s.underpriced_services || 0
  const priced     = s.priced_services      || s.market_priced_services || 0
  const hasFixed   = (s.fixed_costs || s.total_fixed_monthly || 0) > 0

  let score = 0
  if (onboardingDone)                         score += 20
  score += Math.min(total      * 5, 30)
  score += Math.min(priced     * 5, 20)
  score -= underpriced         * 10
  if (hasFixed)                               score += 10
  if (underpriced === 0 && total > 0)         score += 15
  return Math.max(0, Math.min(100, score))
})
</script>

<template>
  <RouterView />
  <DpcMonthlyNudge
    v-if="showNudge"
    :current-score="healthScore"
  />
  <ToastContainer />
</template>
