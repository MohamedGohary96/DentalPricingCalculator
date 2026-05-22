<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppShell          from '@/components/AppShell.vue'
import DpcIcon           from '@/components/DpcIcon.vue'
import LangSwitch        from '@/components/LangSwitch.vue'
import DpcAchievements   from '@/components/DpcAchievements.vue'
import { useRouter }     from 'vue-router'
import { usePricingStore } from '@/stores/pricing.js'
import { useAuthStore }    from '@/stores/auth.js'
import { useI18nStore }    from '@/stores/i18n.js'
import { useAchievements } from '@/composables/useAchievements.js'
import { useMonthlyNudge } from '@/composables/useMonthlyNudge.js'
import { useToast }        from '@/composables/useToast.js'

const router       = useRouter()
const pricingStore = usePricingStore()
const auth         = useAuthStore()
const i18n         = useI18nStore()

const isAr    = computed(() => i18n.locale === 'ar')
const loading = ref(true)

const stats = computed(() => pricingStore.dashboardStats || {})

const greeting = computed(() => {
  const name = auth.user?.first_name || (isAr.value ? 'دكتور' : 'Doctor')
  return isAr.value ? `مرحباً، د. ${name}` : `Welcome, Dr. ${name}`
})

const chairRate    = computed(() => stats.value.chair_hourly_rate   || 0)
const fixedMonthly = computed(() => stats.value.total_fixed_monthly || 0)
const totalSvcs    = computed(() => stats.value.total_services      || 0)
const effectiveH   = computed(() => stats.value.effective_hours     || 0)
const fixedCosts   = computed(() => stats.value.fixed_costs              || 0)
const salaries     = computed(() => stats.value.staff_salaries           || 0)
const equipmentDep = computed(() => stats.value.equipment_depreciation   || 0)

const underpricedCount = computed(() => stats.value.underpriced_services || 0)

const setupChecklist = computed(() => {
  const items = stats.value.setup_checklist || []
  return items.filter(item => !item.done)
})

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// ── Pricing Health Score (0–100) ─────────────────────────────────
// Uses same calculation as sidebar for consistency: 1 - (low / set)
const healthScore = computed(() => {
  const list = pricingStore.priceList || []
  const set  = list.filter(s => s.current_price > 0 && s.rounded_price > 0)
  if (set.length === 0) {
    console.log('📊 Health Score: 0 (no services with prices set)')
    return 0
  }
  const low  = set.filter(s => s.current_price < s.rounded_price * 0.95)
  const score = Math.round((1 - low.length / set.length) * 100)
  console.log(`📊 Health Score: ${score} (${set.length} priced, ${low.length} underpriced)`)
  return score
})

// ── Achievements ─────────────────────────────────────────────────
const { achievements, checkAchievements, newlyUnlocked, clearNewlyUnlocked } = useAchievements()
const { showToast } = useToast()

// Watch for new unlocks → fire the proper toast
watch(newlyUnlocked, (badge) => {
  if (badge) {
    const msg = i18n.locale === 'ar'
      ? `تم فتح إنجاز: ${badge.label} ${badge.icon}`
      : `Achievement unlocked: ${badge.label} ${badge.icon}`
    showToast(msg, 'success', { duration: 5000 })
    clearNewlyUnlocked()
  }
})

// Re-check achievements when health score or stats change
watch([healthScore, stats], ([newScore, newStats]) => {
  if (newStats && Object.keys(newStats).length > 0) {
    checkAchievements(newStats, newScore)
  }
})

// ── Monthly nudge (now event-based) ───────────────────────────────
const { saveHealthScore, checkUnderpricedIncrease, checkCostsChanged } = useMonthlyNudge()

onMounted(async () => {
  loading.value = true
  await Promise.all([
    pricingStore.loadDashboardStats().catch(() => {}),
    pricingStore.loadSetupStatus().catch(() => {}),
    pricingStore.loadServices().catch(() => {}),
  ])
  loading.value = false

  // Run achievements check after data is loaded (pass computed healthScore)
  await checkAchievements(stats.value, healthScore.value)

  // Event-based nudge triggers
  checkUnderpricedIncrease(underpricedCount.value)

  // Check if costs changed (create simple hash from costs)
  const costsHash = `${fixedCosts.value}_${salaries.value}_${equipmentDep.value}`
  checkCostsChanged(costsHash)

  // Persist current health score for comparison
  saveHealthScore(healthScore.value)
})
</script>

<template>
  <AppShell active-key="dashboard">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <div class="eyebrow-teal">{{ isAr ? 'نظرة عامة' : 'Overview' }}</div>
        <h1 class="dpc-h page-title">{{ greeting }}</h1>
      </div>
      <div class="header-actions">
        <button class="dpc-btn dpc-btn-outline btn-sm" @click="router.push('/app/settings')">
          <DpcIcon name="Settings" :size="13" :stroke-width="1.7" />
          {{ isAr ? 'الإعدادات' : 'Settings' }}
        </button>
        <LangSwitch />
      </div>
    </div>

    <!-- Setup checklist bar -->
    <div v-if="setupChecklist.length" class="checklist-bar">
      <div class="checklist-heading">
        <DpcIcon name="AlertCircle" :size="15" :stroke-width="1.6" />
        {{ isAr ? 'أكمل الإعداد:' : 'Finish your setup:' }}
      </div>
      <div class="checklist-items">
        <button
          v-for="item in setupChecklist" :key="item.key"
          class="checklist-item"
          @click="router.push('/app/settings')"
        >
          <DpcIcon name="AlertCircle" :size="13" :stroke-width="1.6" class="item-icon" />
          {{ item.label || item.key }}
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="12" :stroke-width="2" />
        </button>
      </div>
    </div>

    <div class="dash-body">
      <!-- 4 KPI cards (real API data only) -->
      <div class="kpi-grid">
        <!-- Chair hourly rate -->
        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'تكلفة ساعة الكرسي' : 'Chair hourly rate' }}</span>
            <div class="kpi-icon kpi-icon-teal"><DpcIcon name="Clock" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom">
            <span class="dpc-num kpi-value">{{ fmt(chairRate) }}</span>
            <span class="kpi-unit">{{ isAr ? 'ج.م/ساعة' : 'EGP/h' }}</span>
          </div>
          <div class="kpi-sub">
            <button class="kpi-action" @click="router.push('/results/chair-cost')">
              {{ isAr ? `${fmt(effectiveH)} ساعة/شهر ←` : `${fmt(effectiveH)} hrs/month →` }}
            </button>
          </div>
        </div>

        <!-- Monthly fixed costs -->
        <div class="dpc-panel kpi-card kpi-card-wide">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'التكاليف الثابتة الشهرية' : 'Monthly fixed costs' }}</span>
            <div class="kpi-icon kpi-icon-pink"><DpcIcon name="CircleDollarSign" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom" :class="{ 'trial-blur': isTrial }">
            <span class="dpc-num kpi-value">{{ fmt(fixedMonthly) }}</span>
            <span class="kpi-unit">{{ isAr ? 'ج.م' : 'EGP' }}</span>
          </div>
          <div class="kpi-breakdown-list" :class="{ 'trial-blur': isTrial }">
            <div class="breakdown-item">
              <span class="breakdown-lbl">{{ isAr ? 'تكاليف ثابتة' : 'Fixed costs' }}</span>
              <span class="breakdown-val">{{ fmt(fixedCosts) }}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-lbl">{{ isAr ? 'رواتب الموظفين' : 'Staff salaries' }}</span>
              <span class="breakdown-val">{{ fmt(salaries) }}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-lbl">{{ isAr ? 'استهلاك المعدات' : 'Equipment depreciation' }}</span>
              <span class="breakdown-val">{{ fmt(equipmentDep) }}</span>
            </div>
          </div>
          <div class="kpi-sub">
            <button class="kpi-action" @click="router.push('/app/settings')">
              {{ isAr ? 'عرض التفاصيل ←' : 'View details →' }}
            </button>
          </div>
        </div>

        <!-- Total services -->
        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'إجمالي الخدمات' : 'Total services' }}</span>
            <div class="kpi-icon kpi-icon-teal"><DpcIcon name="List" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom">
            <span class="dpc-num kpi-value">{{ totalSvcs }}</span>
          </div>
          <div class="kpi-sub">
            <button class="kpi-action" @click="router.push('/app/services')">
              {{ isAr ? 'إدارة الخدمات ←' : 'Manage services →' }}
            </button>
          </div>
        </div>

        <!-- Pricing health -->
        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'صحة التسعير' : 'Pricing health' }}</span>
            <div class="kpi-icon" :class="underpricedCount > 0 ? 'kpi-icon-danger' : 'kpi-icon-teal'">
              <DpcIcon :name="underpricedCount > 0 ? 'AlertTriangle' : 'CheckCircle'" :size="13" :stroke-width="1.7" />
            </div>
          </div>
          <div class="kpi-bottom" v-if="underpricedCount > 0">
            <span class="dpc-num kpi-value kpi-value-danger">{{ underpricedCount }}</span>
            <span class="kpi-unit">{{ isAr ? 'خدمة سعرها منخفض' : 'underpriced' }}</span>
          </div>
          <div class="kpi-bottom" v-else-if="totalSvcs > 0">
            <span class="kpi-value kpi-value-good">{{ isAr ? 'جيد' : 'Good' }}</span>
          </div>
          <div class="kpi-bottom" v-else>
            <span class="kpi-unit">{{ isAr ? 'لا توجد خدمات بعد' : 'No services yet' }}</span>
          </div>
          <div class="kpi-sub" v-if="underpricedCount > 0">
            <button class="kpi-action kpi-action-danger" @click="router.push('/app/pricing')">
              {{ isAr ? 'عرض قائمة الأسعار ←' : 'View price list →' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state when no services configured -->
      <div v-if="!loading && totalSvcs === 0" class="empty-state">
        <div class="empty-icon">
          <DpcIcon name="Stethoscope" :size="32" :stroke-width="1.3" />
        </div>
        <h3 class="empty-title">{{ isAr ? 'ابدأ بإضافة خدماتك' : 'Start by adding your services' }}</h3>
        <p class="empty-body">{{ isAr
          ? 'أضف خدماتك السنية لتبدأ في حساب التسعير الصحيح.'
          : 'Add your dental services to start calculating accurate pricing.' }}</p>
        <button class="dpc-btn dpc-btn-teal empty-btn" @click="router.push('/app/services')">
          <DpcIcon name="Plus" :size="15" :stroke-width="2" />
          {{ isAr ? 'إضافة خدمات' : 'Add services' }}
        </button>
      </div>

      <!-- Navigation quick-access cards -->
      <div v-else-if="!loading" class="nav-cards">
        <div class="nav-card" @click="router.push('/app/services')">
          <div class="nav-card-icon nav-icon-navy"><DpcIcon name="Stethoscope" :size="20" :stroke-width="1.5" /></div>
          <div class="nav-card-text">
            <div class="nav-card-title">{{ isAr ? 'إدارة الخدمات' : 'Manage services' }}</div>
            <div class="nav-card-sub">{{ isAr ? 'أضف أو عدّل خدماتك' : 'Add or edit your procedures' }}</div>
          </div>
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ChevronLeft' : 'ChevronRight'" :size="16" :stroke-width="1.7" class="nav-chevron" />
        </div>
        <div class="nav-card" @click="router.push('/app/pricing')">
          <div class="nav-card-icon nav-icon-teal"><DpcIcon name="CircleDollarSign" :size="20" :stroke-width="1.5" /></div>
          <div class="nav-card-text">
            <div class="nav-card-title">{{ isAr ? 'قائمة الأسعار' : 'Price list' }}</div>
            <div class="nav-card-sub">{{ isAr ? 'راجع وعدّل أسعارك' : 'Review and adjust your prices' }}</div>
          </div>
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ChevronLeft' : 'ChevronRight'" :size="16" :stroke-width="1.7" class="nav-chevron" />
        </div>
        <div class="nav-card" @click="router.push('/results/chair-cost')">
          <div class="nav-card-icon nav-icon-ink"><DpcIcon name="BarChart2" :size="20" :stroke-width="1.5" /></div>
          <div class="nav-card-text">
            <div class="nav-card-title">{{ isAr ? 'تكلفة الكرسي' : 'Chair cost' }}</div>
            <div class="nav-card-sub">{{ isAr ? 'تفصيل تكلفة ساعة الكرسي' : 'Breakdown of your chair-hour cost' }}</div>
          </div>
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ChevronLeft' : 'ChevronRight'" :size="16" :stroke-width="1.7" class="nav-chevron" />
        </div>
        <div class="nav-card" @click="router.push('/app/settings')">
          <div class="nav-card-icon nav-icon-gray"><DpcIcon name="Settings" :size="20" :stroke-width="1.5" /></div>
          <div class="nav-card-text">
            <div class="nav-card-title">{{ isAr ? 'الإعدادات' : 'Settings' }}</div>
            <div class="nav-card-sub">{{ isAr ? 'عدّل التكاليف والسعة والعملة' : 'Edit costs, capacity, and currency' }}</div>
          </div>
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ChevronLeft' : 'ChevronRight'" :size="16" :stroke-width="1.7" class="nav-chevron" />
        </div>
      </div>

      <!-- Achievements strip (below nav cards) -->
      <DpcAchievements :achievements="achievements" class="ach-section" />
    </div>
  </AppShell>
</template>

<style scoped>
.page-header {
  padding: 32px 32px 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  background: var(--canvas);
  border-bottom: 1px solid var(--line);
}

.eyebrow-teal {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-dark);
  margin-bottom: 8px;
}
.page-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0;
  color: var(--ink-900);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.btn-sm {
  height: 36px;
  font-size: 12px;
}

/* Checklist bar */
.checklist-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 32px;
  background: linear-gradient(135deg, var(--warning-50), #fffbf0);
  border-bottom: 1px solid rgba(245, 158, 11, 0.2);
  flex-wrap: wrap;
}
.checklist-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--warning-700);
  flex: none;
}
.checklist-items {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.checklist-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: #ffffff;
  color: var(--warning-700);
  cursor: pointer;
  border: 1px solid rgba(245, 158, 11, 0.2);
  transition: all var(--transition-fast);
  box-shadow: 0 1px 2px rgba(245, 158, 11, 0.1);
}
.checklist-item:hover {
  background: var(--warning-100);
  border-color: rgba(245, 158, 11, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.15);
}
.item-icon {
  color: var(--warning-600);
}

/* Body */
.dash-body {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}
.ach-section {
  margin-bottom: 32px;
}

/* KPI grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.kpi-card {
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.kpi-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-500);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex: none;
}
.kpi-icon-teal {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.05));
  color: var(--accent-dark);
  box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.15);
}
.kpi-icon-danger {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
  color: var(--danger-600);
  box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.15);
}
.kpi-icon-ink {
  background: var(--surface-2);
  color: var(--ink-700);
  box-shadow: inset 0 0 0 1px var(--line);
}
.kpi-icon-pink {
  background: linear-gradient(135deg, rgba(219, 39, 119, 0.1), rgba(219, 39, 119, 0.05));
  color: #db2777;
  box-shadow: inset 0 0 0 1px rgba(219, 39, 119, 0.15);
}

.kpi-breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
}
.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
}
.breakdown-lbl {
  color: var(--ink-500);
}
.breakdown-val {
  color: var(--ink-900);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  font-size: 12px;
}

.kpi-bottom {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.kpi-value {
  font-family: var(--font-mono);
  font-size: 32px;
  font-weight: 700;
  color: var(--ink-900);
  letter-spacing: -0.02em;
}
.kpi-unit {
  font-size: 13px;
  color: var(--ink-500);
  font-weight: 500;
}
.kpi-value-danger {
  color: var(--danger-600);
}
.kpi-value-good {
  font-family: var(--font-display);
  font-size: 24px;
  color: var(--success);
  font-weight: 700;
}

.kpi-sub {
  font-size: 12px;
  color: var(--ink-500);
}
.kpi-breakdown {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.kpi-action {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-dark);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.kpi-action:hover {
  color: var(--accent);
  text-decoration: underline;
}
.kpi-action-danger {
  color: var(--danger-600);
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 64px 32px;
  background: var(--surface-1);
  border-radius: 16px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
}
.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: var(--surface-2);
  color: var(--ink-400);
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  animation: float 4s var(--ease-in-out-expo, cubic-bezier(0.87, 0, 0.13, 1)) infinite;
}
.empty-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0;
  letter-spacing: -0.01em;
}
.empty-body {
  font-size: 14px;
  color: var(--ink-600);
  max-width: 400px;
  margin: 0;
  line-height: 1.6;
}
.empty-btn {
  height: 44px;
  margin-top: 8px;
}

/* Nav cards */
.nav-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.nav-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--surface-1);
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-xs);
}
.nav-card:hover {
  background: var(--surface-1);
  border-color: var(--accent-dim);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}
.nav-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: none;
  transition: all var(--transition-fast);
}
.nav-icon-teal {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.05));
  color: var(--accent-dark);
  box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.15);
}
.nav-icon-navy {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
  color: #2563eb;
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.15);
}
.nav-icon-ink {
  background: var(--surface-2);
  color: var(--ink-700);
  box-shadow: inset 0 0 0 1px var(--line);
}
.nav-icon-gray {
  background: var(--surface-2);
  color: var(--ink-600);
  box-shadow: inset 0 0 0 1px var(--line);
}

.nav-card-text {
  flex: 1;
  min-width: 0;
}
.nav-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
  margin-bottom: 3px;
  letter-spacing: -0.01em;
}
.nav-card-sub {
  font-size: 12px;
  color: var(--ink-500);
  line-height: 1.5;
}
.nav-chevron {
  color: var(--ink-300);
  flex: none;
  transition: all var(--transition-fast);
}
.nav-card:hover .nav-chevron {
  color: var(--accent-dark);
  transform: translateX(3px);
}
[dir="rtl"] .nav-card:hover .nav-chevron {
  transform: translateX(-3px);
}
</style>
