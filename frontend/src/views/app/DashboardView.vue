<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppShell          from '@/components/AppShell.vue'
import DpcBtn            from '@/components/DpcBtn.vue'
import DpcIcon           from '@/components/DpcIcon.vue'
import LangSwitch        from '@/components/LangSwitch.vue'
import DpcAchievements   from '@/components/DpcAchievements.vue'
import PageHeader        from '@/components/PageHeader.vue'
import StatsCard         from '@/components/StatsCard.vue'
import SectionCard       from '@/components/SectionCard.vue'
import { useRouter }     from 'vue-router'
import { usePricingStore } from '@/stores/pricing.js'
import { useAuthStore }    from '@/stores/auth.js'
import { useI18nStore }    from '@/stores/i18n.js'
import { useAchievements } from '@/composables/useAchievements.js'
import { useMonthlyNudge } from '@/composables/useMonthlyNudge.js'
import { useToast }        from '@/composables/useToast.js'
import axios from 'axios'

const router       = useRouter()
const pricingStore = usePricingStore()
const auth         = useAuthStore()
const i18n         = useI18nStore()

const isAr    = computed(() => i18n.locale === 'ar')
const isTrial = computed(() => auth.isTrial)
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

// Contact info for trial banner
const contactInfo = ref({})

const contactEmail = computed(() => {
  const key = isAr.value ? 'contact_email_ar' : 'contact_email'
  return contactInfo.value[key] || contactInfo.value.contact_email
})

const contactPhone = computed(() => {
  const key = isAr.value ? 'contact_phone_ar' : 'contact_phone'
  return contactInfo.value[key] || contactInfo.value.contact_phone || '+201015755890'
})

const contactWhatsApp = computed(() => {
  const key = isAr.value ? 'contact_whatsapp_ar' : 'contact_whatsapp'
  return contactInfo.value[key] || contactInfo.value.contact_whatsapp || contactPhone.value
})

const setupChecklist = computed(() => {
  const items = stats.value.setup_checklist || []
  return items.filter(item => !item.done)
})

// Setup progress calculation
const setupProgress = computed(() => {
  const all = stats.value.setup_checklist || []
  if (all.length === 0) return 0
  const done = all.filter(item => item.done).length
  return Math.round((done / all.length) * 100)
})

const isSetupComplete = computed(() => setupProgress.value === 100)

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

// Calculate underpriced count from priceList (same source as navbar)
const underpricedFromPriceList = computed(() => {
  const list = pricingStore.priceList || []
  const set  = list.filter(s => s.current_price > 0 && s.rounded_price > 0)
  return set.filter(s => s.current_price < s.rounded_price * 0.95).length
})

// Pricing health status text (same logic as DpcHealthScore)
const healthStatusText = computed(() => {
  const s = healthScore.value
  if (isAr.value) {
    if (s < 40) return 'يحتاج اهتمام'
    if (s < 60) return 'في الطريق'
    if (s < 80) return 'يبدو جيداً'
    return 'ممتاز'
  }
  if (s < 40) return 'Needs attention'
  if (s < 60) return 'Getting there'
  if (s < 80) return 'Looking good'
  return 'Excellent'
})

// ── Achievements ─────────────────────────────────────────────────
const { achievements, checkAchievements, newlyUnlocked, clearNewlyUnlocked } = useAchievements()
const { showToast } = useToast()

// Count of services the user has explicitly priced (current_price set)
const pricedCount = computed(() =>
  (pricingStore.priceList || []).filter(s => s.current_price > 0).length
)

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

// Re-check achievements when health score, stats, or priced count change
watch([healthScore, stats, pricedCount], ([newScore, newStats]) => {
  if (newStats && Object.keys(newStats).length > 0) {
    checkAchievements(newStats, newScore, pricedCount.value)
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
    pricingStore.loadPriceList().catch(() => {}), // Load priceList for health score
    axios.get('/api/contact-info').then(res => contactInfo.value = res.data).catch(() => {}),
  ])
  loading.value = false

  // Run achievements check after data is loaded
  await checkAchievements(stats.value, healthScore.value, pricedCount.value)

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
    <!-- Page header with new component -->
    <PageHeader
      :eyebrow="isAr ? 'نظرة عامة' : 'Overview'"
      :title="greeting"
      icon="LayoutGrid"
      variant="hero"
    >
      <template #actions>
        <DpcBtn variant="secondary" size="sm" icon="Settings" @click="router.push('/app/settings')">
          {{ isAr ? 'الإعدادات' : 'Settings' }}
        </DpcBtn>
        <LangSwitch />
      </template>
    </PageHeader>

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

    <!-- Trial upgrade banner -->
    <div v-if="isTrial" class="trial-upgrade-banner">
      <div class="trial-upgrade-content">
        <div class="trial-upgrade-title">
          🔒 {{ isAr ? 'وضع التجربة نشط' : 'Trial Mode Active' }}
        </div>
        <div class="trial-upgrade-message">
          {{ isAr ? 'الأسعار والتكاليف مخفية. قم بالترقية لرؤية التحليلات الكاملة.' : 'Prices and costs are blurred. Upgrade to see full analytics.' }}
          <span v-if="underpricedCount > 0" style="font-weight:600;margin-inline-start:8px;">
            {{ isAr ? `لديك ${underpricedCount} خدمات بأسعار منخفضة!` : `You have ${underpricedCount} underpriced services!` }}
          </span>
        </div>
      </div>
      <div class="trial-upgrade-actions">
        <!-- Upgrade primary action -->
        <a
          :href="`https://wa.me/${contactWhatsApp.replace(/\D/g,'')}`"
          target="_blank"
          rel="noopener"
          class="trial-action-icon trial-action-primary"
          :title="isAr ? 'ترقية الآن' : 'Upgrade now'"
        >
          <DpcIcon name="Zap" :size="18" :stroke-width="2" />
        </a>

        <!-- WhatsApp -->
        <a
          :href="`https://wa.me/${contactWhatsApp.replace(/\D/g,'')}`"
          target="_blank"
          rel="noopener"
          class="trial-action-icon"
          :title="isAr ? 'واتساب' : 'WhatsApp'"
        >
          <DpcIcon name="WhatsApp" :size="18" :stroke-width="2" />
        </a>

        <!-- Phone -->
        <a
          v-if="contactPhone"
          :href="`tel:${contactPhone}`"
          class="trial-action-icon"
          :title="isAr ? 'اتصل' : 'Call'"
        >
          <DpcIcon name="PhoneCall" :size="18" :stroke-width="2" />
        </a>

        <!-- Email -->
        <a
          v-if="contactEmail"
          :href="`mailto:${contactEmail}`"
          class="trial-action-icon"
          :title="isAr ? 'إيميل' : 'Email'"
        >
          <DpcIcon name="Mail" :size="18" :stroke-width="2" />
        </a>

        <!-- See plans link -->
        <button
          @click="router.push('/app/subscription')"
          class="trial-action-icon"
          :title="isAr ? 'عرض الخطط' : 'See plans'"
        >
          <DpcIcon name="FileText" :size="18" :stroke-width="2" />
        </button>
      </div>
    </div>

    <div class="dash-body">
      <!-- Quick Start Guide — Catchy version with progress -->
      <div v-if="!isSetupComplete" class="quick-start-hero animate-fade-in-down">
        <div class="qs-hero-left">
          <div class="qs-badge">
            <DpcIcon name="Zap" :size="12" :stroke-width="2" />
            {{ isAr ? 'ابدأ هنا' : 'Start here' }}
          </div>
          <h2 class="qs-hero-title">
            {{ isAr ? 'جهّز عيادتك في ' : 'Set up your clinic in ' }}
            <span class="text-teal">{{ isAr ? '٣ خطوات' : '3 steps' }}</span>
          </h2>
          <p class="qs-hero-subtitle">
            {{ isAr
              ? 'احصل على أسعار دقيقة ومربحة لكل خدمة في أقل من ١٠ دقائق'
              : 'Get accurate, profitable prices for every service in under 10 minutes' }}
          </p>

          <!-- What you'll unlock -->
          <div class="qs-unlock" style="margin-top: 8px;">
            <DpcIcon name="Gift" :size="14" :stroke-width="1.8" />
            <span>{{ isAr ? 'بعد الإكمال: أسعار دقيقة، تحليل الهامش، كشف نقص الأسعار' : 'After setup: Accurate pricing, margin analysis, underpricing alerts' }}</span>
          </div>
        </div>

        <div class="qs-hero-right">
          <div class="qs-steps-vertical">
            <div class="qs-step-card hover-lift" @click="router.push('/app/settings')">
              <div class="qs-step-check" :class="setupProgress >= 33 && 'is-done'">
                <DpcIcon :name="setupProgress >= 33 ? 'Check' : ''" :size="12" :stroke-width="3" />
              </div>
              <div class="qs-step-icon">
                <DpcIcon name="Settings" :size="20" :stroke-width="1.6" />
              </div>
              <div class="qs-step-content">
                <h4>{{ isAr ? '١. ضبط الإعدادات' : '1. Configure Settings' }}</h4>
                <p>{{ isAr ? 'التكاليف، الرواتب، ساعات العمل' : 'Costs, salaries, working hours' }}</p>
              </div>
              <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" class="qs-step-arrow" />
            </div>

            <div class="qs-step-card hover-lift" @click="router.push('/app/consumables')">
              <div class="qs-step-check" :class="setupProgress >= 66 && 'is-done'">
                <DpcIcon :name="setupProgress >= 66 ? 'Check' : ''" :size="12" :stroke-width="3" />
              </div>
              <div class="qs-step-icon">
                <DpcIcon name="Package" :size="20" :stroke-width="1.6" />
              </div>
              <div class="qs-step-content">
                <h4>{{ isAr ? '٢. المستلزمات والمواد' : '2. Consumables & Materials' }}</h4>
                <p>{{ isAr ? 'قفازات، مخدر، شاش، خيوط' : 'Gloves, anesthetics, gauze, sutures' }}</p>
              </div>
              <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" class="qs-step-arrow" />
            </div>

            <div class="qs-step-card hover-lift" @click="router.push('/app/services')">
              <div class="qs-step-check" :class="setupProgress === 100 && 'is-done'">
                <DpcIcon :name="setupProgress === 100 ? 'Check' : ''" :size="12" :stroke-width="3" />
              </div>
              <div class="qs-step-icon">
                <DpcIcon name="Stethoscope" :size="20" :stroke-width="1.6" />
              </div>
              <div class="qs-step-content">
                <h4>{{ isAr ? '٣. إنشاء الخدمات' : '3. Create Services' }}</h4>
                <p>{{ isAr ? 'حدد الإجراءات والأسعار تحسب تلقائياً' : 'Define procedures, prices auto-calculate' }}</p>
              </div>
              <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" class="qs-step-arrow" />
            </div>
          </div>
        </div>
      </div>

      <!-- Completion celebration (shown when setup is 100%) -->
      <div v-else class="setup-complete-banner animate-scale-in">
        <DpcIcon name="PartyPopper" :size="32" :stroke-width="1.5" class="party-icon" />
        <div class="complete-content">
          <h3>{{ isAr ? '🎉 رائع! الإعداد مكتمل' : '🎉 Awesome! Setup Complete' }}</h3>
          <p>{{ isAr ? 'الآن يمكنك الاستفادة من كامل قوة الحاسبة' : 'You can now use the full power of the calculator' }}</p>
        </div>
        <DpcBtn variant="primary" size="md" @click="router.push('/results/price-list')">
          {{ isAr ? 'عرض قائمة الأسعار' : 'View price list' }}
        </DpcBtn>
      </div>

      <!-- Premium KPI cards with animations -->
      <div class="kpi-grid animate-fade-in-up">
        <!-- Chair hourly rate -->
        <div :class="{ 'trial-blur': isTrial }" :style="{ animationDelay: 'var(--stagger-1)' }">
          <StatsCard
            :label="isAr ? 'تكلفة ساعة الكرسي' : 'Chair hourly rate'"
            :value="chairRate"
            :unit="isAr ? 'ج.م/ساعة' : 'EGP/h'"
            icon="Clock"
            :loading="loading"
            @click="router.push('/results/chair-cost')"
          />
        </div>

        <!-- Monthly fixed costs (wide card with breakdown) -->
        <div class="kpi-card-wide animate-fade-in-up" :class="{ 'trial-blur': isTrial }" :style="{ animationDelay: 'var(--stagger-2)' }">
          <div class="dpc-panel" style="padding: 20px;">
            <div class="kpi-top">
              <span class="kpi-label">{{ isAr ? 'التكاليف الثابتة الشهرية' : 'Monthly fixed costs' }}</span>
              <div class="kpi-icon kpi-icon-pink"><DpcIcon name="CircleDollarSign" :size="13" :stroke-width="1.7" /></div>
            </div>
            <div class="kpi-bottom">
              <span class="dpc-num kpi-value">{{ fmt(fixedMonthly) }}</span>
              <span class="kpi-unit">{{ isAr ? 'ج.م' : 'EGP' }}</span>
            </div>
            <div class="kpi-breakdown-list">
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
              <DpcBtn variant="link" size="sm" @click="router.push('/app/settings')">
                {{ isAr ? 'عرض التفاصيل ←' : 'View details →' }}
              </DpcBtn>
            </div>
          </div>
        </div>

        <!-- Total services -->
        <div class="animate-fade-in-up" :style="{ animationDelay: 'var(--stagger-3)' }">
          <StatsCard
            :label="isAr ? 'إجمالي الخدمات' : 'Total services'"
            :value="totalSvcs"
            icon="List"
            :loading="loading"
            @click="router.push('/app/services')"
          />
        </div>

        <!-- Pricing health (uses same source as navbar) -->
        <div class="animate-fade-in-up" :style="{ animationDelay: 'var(--stagger-4)' }">
          <StatsCard
            :label="isAr ? 'صحة التسعير' : 'Pricing health'"
            :value="underpricedFromPriceList > 0 ? underpricedFromPriceList : (totalSvcs > 0 ? healthStatusText : '-')"
            :unit="underpricedFromPriceList > 0 ? (isAr ? 'منخفض' : 'underpriced') : ''"
            :icon="underpricedFromPriceList > 0 ? 'AlertTriangle' : 'CheckCircle'"
            :variant="underpricedFromPriceList > 0 ? 'danger' : 'success'"
            :loading="loading"
            @click="underpricedFromPriceList > 0 && router.push('/results/price-list')"
          />
        </div>
      </div>

      <!-- Navigation quick-access cards -->
      <div v-if="!loading && totalSvcs > 0" class="nav-cards">
        <div class="nav-card" @click="router.push('/app/services')">
          <div class="nav-card-icon nav-icon-navy"><DpcIcon name="Stethoscope" :size="20" :stroke-width="1.5" /></div>
          <div class="nav-card-text">
            <div class="nav-card-title">{{ isAr ? 'إدارة الخدمات' : 'Manage services' }}</div>
            <div class="nav-card-sub">{{ isAr ? 'أضف أو عدّل خدماتك' : 'Add or edit your procedures' }}</div>
          </div>
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ChevronLeft' : 'ChevronRight'" :size="16" :stroke-width="1.7" class="nav-chevron" />
        </div>
        <div class="nav-card" @click="router.push('/results/price-list')">
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

      <!-- Achievements strip (below nav cards) — hidden for now -->
      <!-- <DpcAchievements :achievements="achievements" class="ach-section" /> -->
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

.kpi-action-danger {
  color: var(--danger-600) !important;
}

/* Catchy Quick Start Hero */
.quick-start-hero {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 32px;
  padding: 32px;
  background: linear-gradient(135deg, var(--teal-50) 0%, rgba(236, 253, 245, 0.4) 100%);
  border: 1.5px solid var(--teal-100);
  border-radius: var(--radius-lg);
  margin-bottom: 32px;
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.08);
}

.qs-hero-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
}

.qs-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--teal-600);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.qs-hero-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.qs-hero-subtitle {
  font-size: 15px;
  color: var(--ink-600);
  margin: 0;
  line-height: 1.5;
}

.qs-unlock {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-md);
  border: 1px solid var(--teal-100);
  font-size: 12.5px;
  color: var(--ink-700);
  font-weight: 500;
}

.qs-hero-right {
  display: flex;
  flex-direction: column;
}

.qs-steps-vertical {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qs-step-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast);
  box-shadow: var(--shadow-xs);
}

.qs-step-card:hover {
  border-color: var(--teal-300);
  box-shadow: var(--shadow-md);
}

.qs-step-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  flex: none;
  transition: all var(--duration-fast);
}

.qs-step-check.is-done {
  background: var(--success-600);
  border-color: var(--success-600);
  color: #fff;
  animation: check-bounce 0.4s var(--ease-spring);
}

@keyframes check-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.qs-step-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  flex: none;
  box-shadow: inset 0 0 0 1px var(--teal-100);
  transition: all var(--duration-fast);
}

.qs-step-card:hover .qs-step-icon {
  transform: rotate(5deg) scale(1.05);
  background: var(--teal-100);
}

.qs-step-content {
  flex: 1;
  min-width: 0;
}

.qs-step-content h4 {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink-900);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.qs-step-content p {
  font-size: 12.5px;
  color: var(--ink-500);
  margin: 0;
  line-height: 1.4;
}

.qs-step-arrow {
  color: var(--ink-300);
  flex: none;
  transition: all var(--duration-fast);
}

.qs-step-card:hover .qs-step-arrow {
  color: var(--teal-600);
  transform: translateX(4px);
}

[dir="rtl"] .qs-step-card:hover .qs-step-arrow {
  transform: translateX(-4px);
}

/* Setup completion banner */
.setup-complete-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: linear-gradient(135deg, var(--success-50) 0%, rgba(236, 253, 245, 0.4) 100%);
  border: 1.5px solid var(--success-200);
  border-radius: var(--radius-lg);
  margin-bottom: 32px;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.1);
}

.party-icon {
  color: var(--success-600);
  flex: none;
  animation: party-bounce 1s ease-in-out infinite;
}

@keyframes party-bounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(-10deg); }
  75% { transform: translateY(-5px) rotate(10deg); }
}

.complete-content {
  flex: 1;
}

.complete-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.complete-content p {
  font-size: 13.5px;
  color: var(--ink-600);
  margin: 0;
}

/* Responsive */
@media (max-width: 968px) {
  .quick-start-hero {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 680px) {
  .qs-hero-title {
    font-size: 24px;
  }

  .setup-complete-banner {
    flex-direction: column;
    text-align: center;
  }
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

/* Trial upgrade banner */
.trial-upgrade-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 32px;
  background: linear-gradient(135deg, var(--warning-50), #fffbf0);
  border-bottom: 1px solid rgba(245, 158, 11, 0.2);
}

.trial-upgrade-content {
  flex: 1;
}

.trial-upgrade-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--warning-800);
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}

.trial-upgrade-message {
  font-size: 13.5px;
  color: var(--warning-700);
  line-height: 1.5;
}

.trial-upgrade-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: none;
}

/* Trial action icons */
.trial-action-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm, 8px);
  background: #fff;
  border: 1px solid rgba(245, 158, 11, 0.25);
  display: grid;
  place-items: center;
  color: var(--warning-700);
  text-decoration: none;
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  flex: none;
  cursor: pointer;
}

.trial-action-icon:hover {
  transform: translateY(-2px);
  background: var(--teal-50);
  border-color: var(--teal-300);
  color: var(--teal-700);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15);
}

.trial-action-icon:active {
  transform: translateY(0);
}

/* Primary action icon (Upgrade) */
.trial-action-primary {
  background: linear-gradient(135deg, var(--teal-500), var(--teal-600));
  border-color: var(--teal-600);
  color: #fff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
}

.trial-action-primary:hover {
  background: linear-gradient(135deg, var(--teal-400), var(--teal-500));
  border-color: var(--teal-500);
  color: #fff;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
}

/* Responsive */
@media (max-width: 768px) {
  .trial-upgrade-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .trial-upgrade-actions {
    width: 100%;
    justify-content: center;
  }

  .trial-action-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
