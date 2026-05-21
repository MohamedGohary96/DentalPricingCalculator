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
const fixedCosts   = computed(() => stats.value.fixed_costs         || 0)
const salaries     = computed(() => stats.value.staff_salaries      || 0)

const underpricedCount = computed(() => stats.value.underpriced_services || 0)

const setupChecklist = computed(() => {
  const items = stats.value.setup_checklist || []
  return items.filter(item => !item.done)
})

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// ── Pricing Health Score (0–100) ─────────────────────────────────
const healthScore = computed(() => {
  const s = stats.value
  const onboardingDone = auth.user?.onboarding_completed === 1 || auth.user?.onboarding_completed === true
  const total      = s.total_services      || 0
  const underpriced = s.underpriced_services || underpricedCount.value
  const priced     = s.priced_services     || s.market_priced_services || 0
  const hasFixed   = (s.fixed_costs || s.total_fixed_monthly || 0) > 0

  let score = 0
  if (onboardingDone)    score += 20
  score += Math.min(total * 5, 30)
  score += Math.min(priced * 5, 20)
  score -= underpriced * 10
  if (hasFixed)          score += 10
  if (underpriced === 0 && total > 0) score += 15
  return Math.max(0, Math.min(100, score))
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

// ── Monthly nudge ─────────────────────────────────────────────────
const { saveHealthScore } = useMonthlyNudge()

onMounted(async () => {
  loading.value = true
  await Promise.all([
    pricingStore.loadDashboardStats().catch(() => {}),
    pricingStore.loadSetupStatus().catch(() => {}),
    pricingStore.loadServices().catch(() => {}),
  ])
  loading.value = false

  // Run achievements check after data is loaded
  await checkAchievements(stats.value)

  // Persist current health score for monthly nudge comparison
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
      <!-- Achievements strip (below checklist, above KPIs) -->
      <DpcAchievements :achievements="achievements" class="ach-section" />

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
        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'التكاليف الثابتة الشهرية' : 'Monthly fixed costs' }}</span>
            <div class="kpi-icon kpi-icon-ink"><DpcIcon name="CircleDollarSign" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom">
            <span class="dpc-num kpi-value">{{ fmt(fixedMonthly) }}</span>
            <span class="kpi-unit">{{ isAr ? 'ج.م' : 'EGP' }}</span>
          </div>
          <div class="kpi-sub kpi-breakdown">
            <span>{{ isAr ? 'ثابت:' : 'Fixed:' }} {{ fmt(fixedCosts) }}</span>
            <span>· {{ isAr ? 'رواتب:' : 'Staff:' }} {{ fmt(salaries) }}</span>
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
    </div>
  </AppShell>
</template>

<style scoped>
.page-header {
  padding: 22px 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.eyebrow-teal {
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--teal-700); margin-bottom: 4px;
}
.page-title { font-size: 24px; margin-bottom: 0; }

.header-actions { display: flex; gap: 8px; align-items: center; }
.btn-sm { height: 36px; }

/* Checklist bar */
.checklist-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 28px;
  background: var(--warning-50);
  border-bottom: 1px solid var(--warning-200, #fde68a);
  flex-wrap: wrap;
}
.checklist-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--warning-700);
  flex: none;
}
.checklist-items { display: flex; gap: 8px; flex-wrap: wrap; }
.checklist-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: var(--warning-100, #fef3c7);
  color: var(--warning-800, #92400e);
  cursor: pointer;
  border: none;
  transition: background .12s;
}
.checklist-item:hover { background: var(--warning-200, #fde68a); }
.item-icon { color: var(--warning-600); }

/* Body */
.dash-body { padding: 20px 28px 32px; }
.ach-section { margin-bottom: 20px; }

/* KPI grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}

.kpi-card { padding: 18px; }

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.kpi-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.kpi-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.kpi-icon-teal   { background: var(--teal-50);  color: var(--teal-700); }
.kpi-icon-danger { background: var(--danger-50); color: var(--danger-700); }
.kpi-icon-ink    { background: var(--paper-2);  color: var(--ink-700); }

.kpi-bottom { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
.kpi-value  { font-size: 26px; font-weight: 600; color: var(--ink-900); }
.kpi-unit   { font-size: 12px; color: var(--ink-500); }
.kpi-value-danger { color: var(--danger-700); }
.kpi-value-good   { font-size: 22px; color: var(--teal-700); font-weight: 600; }

.kpi-sub { font-size: 11.5px; color: var(--ink-500); }
.kpi-breakdown { display: flex; gap: 6px; flex-wrap: wrap; }

.kpi-action {
  background: none;
  border: none;
  padding: 0;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--teal-700);
  cursor: pointer;
}
.kpi-action:hover { text-decoration: underline; }
.kpi-action-danger { color: var(--danger-700); }

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 48px 24px;
  background: var(--surface);
  border-radius: var(--r);
  box-shadow: inset 0 0 0 1px var(--line);
}
.empty-icon {
  width: 72px; height: 72px;
  border-radius: 18px;
  background: var(--paper-2);
  color: var(--ink-400);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--line);
}
.empty-title { font-size: 20px; font-weight: 700; color: var(--ink-900); margin: 0; }
.empty-body  { font-size: 14px; color: var(--ink-500); max-width: 380px; margin: 0; }
.empty-btn   { height: 44px; }

/* Nav cards */
.nav-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.nav-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--paper);
  border-radius: var(--r);
  box-shadow: inset 0 0 0 1px var(--line);
  cursor: pointer;
  transition: box-shadow .12s, background .12s;
}
.nav-card:hover {
  background: var(--surface);
  box-shadow: inset 0 0 0 1.5px var(--teal-300);
}
.nav-card-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: none;
}
.nav-icon-teal { background: var(--teal-50);  color: var(--teal-700); }
.nav-icon-navy { background: #e8edf5;          color: #163058; }
.nav-icon-ink  { background: var(--paper-2);  color: var(--ink-700); }
.nav-icon-gray { background: var(--surface);  color: var(--ink-500); box-shadow: inset 0 0 0 1px var(--line); }

.nav-card-text { flex: 1; min-width: 0; }
.nav-card-title { font-size: 14px; font-weight: 600; color: var(--ink-900); margin-bottom: 2px; }
.nav-card-sub   { font-size: 12.5px; color: var(--ink-500); }
.nav-chevron    { color: var(--ink-400); flex: none; }
</style>
