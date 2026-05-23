<script setup>
import { computed, onMounted } from 'vue'
import { useRouter }      from 'vue-router'
import DpcIcon            from './DpcIcon.vue'
import DpcLogo            from './DpcLogo.vue'
import DpcHealthScore     from './DpcHealthScore.vue'
import DpcLastReview      from './DpcLastReview.vue'
import { useAuthStore }   from '@/stores/auth.js'
import { useI18nStore }   from '@/stores/i18n.js'
import { usePricingStore } from '@/stores/pricing.js'
import { useRestriction } from '@/composables/useRestriction.js'

defineProps({
  activeKey: { type: String, default: 'dashboard' },
})

const router       = useRouter()
const auth         = useAuthStore()
const i18n         = useI18nStore()
const pricingStore = usePricingStore()
const { isTrial, isLockout } = useRestriction()

onMounted(() => {
  pricingStore.loadDashboardStats().catch(() => {})
  // Only load price list if not already loaded (avoid race on refresh)
  if (!pricingStore.priceList || pricingStore.priceList.length === 0) {
    pricingStore.loadPriceList().catch(err => {
      console.warn('[AppShell] Failed to load price list:', err)
    })
  }
})

// Health score: 1 - (low / set), null while loading, 0 if no priced services
const sidebarHealthScore = computed(() => {
  if (!pricingStore.priceListLoaded) return null
  const list = pricingStore.priceList || []
  const set  = list.filter(s => s.current_price > 0 && s.rounded_price > 0)
  if (set.length === 0) return 0
  const low  = set.filter(s => s.current_price < s.rounded_price * 0.95)
  return Math.round((1 - low.length / set.length) * 100)
})

const navItems = computed(() => {
  const items = [
    { key: 'dashboard',    icon: 'LayoutGrid',        labelKey: 'nav.dashboard',   route: '/app/dashboard' },
    { key: 'consumables',  icon: 'Package',           labelKey: 'nav.consumables', route: '/app/consumables' },
    { key: 'services',     icon: 'List',              labelKey: 'nav.services',    route: '/app/services' },
    { key: 'pricing',      icon: 'CircleDollarSign',  labelKey: 'nav.pricing',     route: '/results/price-list' },
    { key: 'cases',        icon: 'Calendar',          labelKey: 'nav.cases',       route: '/app/cases' },
    { key: 'settings',     icon: 'Settings',          labelKey: 'nav.settings',    route: '/app/settings' },
    { key: 'subscription', icon: 'Star',              labelKey: 'nav.subscription',route: '/app/subscription' },
  ]
  if (auth.user?.is_super_admin) {
    items.push({ key: 'super-admin', icon: 'Shield', labelKey: 'nav.superAdmin', route: '/app/super-admin' })
  }
  return items
})

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

async function logout() {
  try {
    await fetch('/logout', { method: 'POST', credentials: 'include' })
  } catch (e) {
    console.error('Logout failed:', e)
  }
  // Clear auth state and redirect
  auth.user = null
  router.push('/login')
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
        <DpcHealthScore v-if="sidebarHealthScore !== null" :score="sidebarHealthScore" />
        <div v-else class="health-loading">--</div>

        <!-- Last price review indicator -->
        <DpcLastReview />

        <!-- Upgrade CTA — only shown for trial / expired accounts -->
        <button v-if="isTrial || isLockout" class="upgrade-cta" @click="router.push('/app/subscription')">
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
        <button class="logout-btn" @click="logout" :title="i18n.locale === 'ar' ? 'تسجيل الخروج' : 'Logout'">
          <DpcIcon name="LogOut" :size="16" :stroke-width="1.8" />
        </button>
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
  background: var(--canvas);
}

.sidebar {
  width: 240px;
  flex: none;
  background: var(--surface-1);
  border-inline-end: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  overflow-y: auto;
}

.sidebar-brand {
  padding: 0 4px 24px;
  margin-bottom: 8px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--ink-600);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
  position: relative;
}
.nav-item:hover:not(.is-active) {
  background: var(--surface-2);
  color: var(--ink-900);
}
.nav-item.is-active {
  background: var(--surface-2);
  color: var(--ink-900);
  font-weight: 600;
}
.nav-item.is-active::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

/* ── Gamification sidebar ─────────────────────────────────────── */
.sidebar-gamification {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.health-loading {
  font-size: 13px;
  color: var(--ink-300);
  text-align: center;
  padding: 8px 0;
}

.upgrade-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-dark);
  background: var(--teal-50);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.1);
  position: relative;
  overflow: hidden;
}

.upgrade-cta:hover {
  background: var(--teal-100);
  box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.2);
  transform: translateY(-1px);
}

.user-card {
  margin-top: auto;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all var(--transition-fast);
}
.user-card:hover {
  border-color: var(--line-strong);
  background: var(--surface-3);
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #3b82f6);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
  flex: none;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.2);
}
.user-info {
  min-width: 0;
  flex: 1;
}
.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.clinic-name {
  font-size: 11px;
  color: var(--ink-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.logout-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: transparent;
  color: var(--ink-500);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex: none;
}
.logout-btn:hover {
  background: var(--surface-0);
  color: var(--danger-600);
}

.main-area {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
</style>
