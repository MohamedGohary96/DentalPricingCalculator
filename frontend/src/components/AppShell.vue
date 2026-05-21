<script setup>
import { computed } from 'vue'
import { useRouter }      from 'vue-router'
import DpcIcon            from './DpcIcon.vue'
import DpcLogo            from './DpcLogo.vue'
import DpcHealthScore     from './DpcHealthScore.vue'
import DpcLastReview      from './DpcLastReview.vue'
import { useAuthStore }   from '@/stores/auth.js'
import { useI18nStore }   from '@/stores/i18n.js'
import { usePricingStore } from '@/stores/pricing.js'

defineProps({
  activeKey: { type: String, default: 'dashboard' },
})

const router       = useRouter()
const auth         = useAuthStore()
const i18n         = useI18nStore()
const pricingStore = usePricingStore()

// Health score computed from dashboard stats
const sidebarHealthScore = computed(() => {
  const s = pricingStore.dashboardStats || {}
  const onboardingDone = auth.user?.onboarding_completed === 1 || auth.user?.onboarding_completed === true
  const total       = s.total_services       || 0
  const underpriced = s.underpriced_services || 0
  const priced      = s.priced_services      || s.market_priced_services || 0
  const hasFixed    = (s.fixed_costs || s.total_fixed_monthly || 0) > 0

  let score = 0
  if (onboardingDone)                          score += 20
  score += Math.min(total      * 5, 30)
  score += Math.min(priced     * 5, 20)
  score -= underpriced         * 10
  if (hasFixed)                                score += 10
  if (underpriced === 0 && total > 0)          score += 15
  return Math.max(0, Math.min(100, score))
})

const navItems = [
  { key: 'dashboard',    icon: 'LayoutGrid',        labelKey: 'nav.dashboard',   route: '/app/dashboard' },
  { key: 'services',     icon: 'List',              labelKey: 'nav.services',    route: '/app/services' },
  { key: 'pricing',      icon: 'CircleDollarSign',  labelKey: 'nav.pricing',     route: '/results/price-list' },
  { key: 'consumables',  icon: 'Package',           labelKey: 'nav.consumables', route: '/app/consumables' },
  { key: 'cases',        icon: 'Calendar',          labelKey: 'nav.cases',       route: '/app/cases' },
  { key: 'settings',     icon: 'Settings',          labelKey: 'nav.settings',    route: '/app/settings' },
  { key: 'subscription', icon: 'Star',              labelKey: 'nav.subscription',route: '/app/subscription' },
]

function navLabel(item) {
  const k = i18n.t(item.labelKey)
  return k === item.labelKey ? item.key.charAt(0).toUpperCase() + item.key.slice(1) : k
}

const userInitials = () => {
  const name = auth.user?.first_name || auth.user?.username || '?'
  return name.slice(0, 2).toUpperCase()
}
const clinicName = () => auth.user?.clinic_name || ''
const userName = () => {
  const u = auth.user
  if (!u) return ''
  return u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username
}
</script>

<template>
  <div class="shell">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <DpcLogo />
      </div>

      <nav class="sidebar-nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          :class="['nav-item', item.key === activeKey && 'is-active']"
          @click="router.push(item.route)"
        >
          <DpcIcon :name="item.icon" :size="17" :stroke-width="1.6" />
          <span>{{ navLabel(item) }}</span>
        </div>
      </nav>

      <!-- ── Gamification sidebar section ─────────────────────── -->
      <div class="sidebar-gamification">
        <!-- Pricing Health Score ring -->
        <DpcHealthScore :score="sidebarHealthScore" />

        <!-- Last price review indicator -->
        <DpcLastReview />

        <!-- Upgrade CTA (existing upgrade prompt) -->
        <button class="upgrade-cta" @click="router.push('/app/subscription')">
          <DpcIcon name="Star" :size="13" :stroke-width="1.8" />
          <span>{{ i18n.t('nav.upgradeCta') || 'Upgrade to Pro →' }}</span>
        </button>
      </div>

      <!-- User card -->
      <div class="user-card">
        <div class="avatar">{{ userInitials() }}</div>
        <div class="user-info">
          <div class="user-name">{{ userName() }}</div>
          <div class="clinic-name">{{ clinicName() }}</div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-area">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--paper);
}

.sidebar {
  width: 240px;
  flex: none;
  background: var(--surface);
  border-inline-end: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  overflow-y: auto;
}

.sidebar-brand { padding: 4px 8px 16px; }

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--ink-600);
  font-size: 13.5px;
  font-weight: 400;
  cursor: pointer;
  transition: background .12s, color .12s;
  user-select: none;
}
.nav-item:hover:not(.is-active) { background: var(--paper-2); }
.nav-item.is-active {
  background: var(--ink-900);
  color: #fff;
  font-weight: 500;
}

/* ── Gamification sidebar ─────────────────────────────────────── */
.sidebar-gamification {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upgrade-cta {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--r);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--teal-700);
  background: var(--teal-50);
  border: none;
  cursor: pointer;
  transition: background 0.12s;
  box-shadow: inset 0 0 0 1px var(--teal-100);
}

.upgrade-cta:hover {
  background: var(--teal-100);
}

.user-card {
  margin-top: 16px;
  padding: 14px;
  border-radius: 12px;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--teal-500), var(--navy-700));
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 12px;
  flex: none;
}
.user-info { min-width: 0; }
.user-name  { font-size: 13px; font-weight: 500; color: var(--ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.clinic-name{ font-size: 11px; color: var(--ink-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.main-area {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
</style>
