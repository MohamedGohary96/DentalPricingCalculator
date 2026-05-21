<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useI18nStore } from '@/stores/i18n.js'
import { useRestriction } from '@/composables/useRestriction.js'
import { useRouter } from 'vue-router'
import axios from 'axios'

const i18n   = useI18nStore()
const router = useRouter()
const isAr   = computed(() => i18n.locale === 'ar')
const { isLockout } = useRestriction()
const api    = axios.create({ withCredentials: true })

// Month selector — current month + 5 prior months
const now = new Date()
const monthOptions = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
  const val   = d.toISOString().slice(0, 7) // YYYY-MM
  const label = d.toLocaleDateString(isAr.value ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' })
  return { val, label }
})
const selectedMonth = ref(monthOptions[0].val)

const services  = ref([])   // raw service list
const priceMap  = ref({})   // id → { price, materials_cost }
const counts    = ref({})   // service_id → count
const history   = ref([])   // [{ month, total_cases }]
const saving    = ref(false)
const loading   = ref(true)

// Group services by category
const grouped = computed(() => {
  const g = {}
  for (const s of services.value) {
    const cat = s.category_name || s.category || (isAr.value ? 'غير مصنّف' : 'Uncategorized')
    if (!g[cat]) g[cat] = []
    g[cat].push(s)
  }
  return g
})

// Live metrics
const totalCases = computed(() =>
  Object.values(counts.value).reduce((s, n) => s + (parseInt(n) || 0), 0)
)
const estRevenue = computed(() =>
  services.value.reduce((s, sv) => {
    const cnt = parseInt(counts.value[sv.id]) || 0
    const p   = priceMap.value[sv.id]?.price || 0
    return s + cnt * p
  }, 0)
)
const matCost = computed(() =>
  services.value.reduce((s, sv) => {
    const cnt = parseInt(counts.value[sv.id]) || 0
    const mc  = priceMap.value[sv.id]?.materials_cost || 0
    return s + cnt * mc
  }, 0)
)
const matPct = computed(() =>
  estRevenue.value > 0 ? (matCost.value / estRevenue.value * 100).toFixed(1) : null
)

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function svcName(s) {
  return isAr.value ? (s.name_ar || s.name_en || s.name || '') : (s.name_en || s.name || s.name_ar || '')
}

function monthLabel(monthStr) {
  const d = new Date(monthStr + '-01')
  return d.toLocaleDateString(isAr.value ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short' })
}

async function loadMonth(month) {
  loading.value = true
  try {
    const { data } = await api.get(`/api/case-tracker?month=${month}`)
    const saved = data.counts || {}
    // Reset and apply saved counts
    const fresh = {}
    for (const s of services.value) fresh[s.id] = saved[s.id] || 0
    counts.value = fresh
  } catch {
    // first time — all zeros
    const fresh = {}
    for (const s of services.value) fresh[s.id] = 0
    counts.value = fresh
  }
  loading.value = false
}

async function save() {
  saving.value = true
  try {
    await api.post('/api/case-tracker', {
      month:  selectedMonth.value,
      counts: counts.value,
    })
    // Refresh history
    const { data } = await api.get('/api/case-tracker/history')
    history.value = data || []
  } catch (e) {
    console.error('Save failed', e)
  }
  saving.value = false
}

watch(selectedMonth, (m) => loadMonth(m))

onMounted(async () => {
  try {
    const [svcRes, plRes, histRes] = await Promise.all([
      api.get('/api/services'),
      api.get('/api/price-list').catch(() => ({ data: [] })),
      api.get('/api/case-tracker/history').catch(() => ({ data: [] })),
    ])
    services.value = svcRes.data || []
    history.value  = histRes.data || []

    // Build price map
    const pm = {}
    for (const p of (plRes.data || [])) {
      pm[p.id] = {
        price:         p.current_price || p.rounded_price || p.your_price || 0,
        materials_cost: p.materials_cost || 0,
      }
    }
    priceMap.value = pm
  } catch (e) {
    console.error('Load failed', e)
  }
  await loadMonth(selectedMonth.value)
})
</script>

<template>
  <AppShell active-key="cases">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="dpc-h page-title">{{ isAr ? 'متتبع الحالات الشهري' : 'Monthly Case Tracker' }}</h1>
        <p class="page-sub">{{ isAr ? 'سجّل حالاتك واعرف كم تصرف على الخامات فعلاً.' : 'Record your cases and track actual materials spend.' }}</p>
      </div>
      <div class="header-actions">
        <LangSwitch />
      </div>
    </div>

    <!-- Lockout wall -->
    <div v-if="isLockout" class="lockout-wall">
      <div class="lockout-icon">
        <DpcIcon name="Calendar" :size="32" :stroke-width="1.4" />
      </div>
      <h3 class="lockout-title">{{ isAr ? 'متتبع الحالات الشهري' : 'Monthly Case Tracker' }}</h3>
      <p class="lockout-body">{{ isAr
        ? 'سجّل حالاتك الشهرية واعرف كم تصرف على الخامات فعلاً — متاح للمشتركين.'
        : 'Record your monthly cases and track real materials spend — available for subscribers.' }}</p>
      <div class="lockout-features">
        <div class="lockout-feature">
          <DpcIcon name="BarChart2" :size="15" :stroke-width="1.7" />
          {{ isAr ? 'نسبة الخامات الفعلية شهرياً' : 'Actual materials % per month' }}
        </div>
        <div class="lockout-feature">
          <DpcIcon name="CircleDollarSign" :size="15" :stroke-width="1.7" />
          {{ isAr ? 'الإيراد المقدّر لكل شهر' : 'Estimated revenue per month' }}
        </div>
        <div class="lockout-feature">
          <DpcIcon name="TrendingUp" :size="15" :stroke-width="1.7" />
          {{ isAr ? 'مقارنة آخر ١٢ شهراً' : 'Last 12-month history' }}
        </div>
      </div>
      <button class="dpc-btn dpc-btn-teal lockout-btn" @click="router.push('/app/subscription')">
        {{ isAr ? 'الترقية للوصول' : 'Upgrade for Access' }}
        <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="15" :stroke-width="2" />
      </button>
    </div>

    <!-- Main content -->
    <template v-else>
      <!-- Month selector -->
      <div class="month-bar">
        <label class="month-label">{{ isAr ? 'الشهر:' : 'Month:' }}</label>
        <select v-model="selectedMonth" class="month-select">
          <option v-for="m in monthOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>
      </div>

      <div class="ct-layout">
        <!-- Left: Case count input table -->
        <div class="dpc-panel input-card">
          <div class="card-header">
            <div class="mini-eyebrow">{{ isAr ? 'عدد الحالات' : 'Case Counts' }}</div>
            <span class="month-chip">{{ monthOptions.find(m => m.val === selectedMonth)?.label }}</span>
          </div>

          <div class="ct-table-wrap">
            <div class="ct-thead">
              <div>{{ isAr ? 'الخدمة' : 'Service' }}</div>
              <div class="col-end">{{ isAr ? 'السعر' : 'Price' }}</div>
              <div class="col-center">{{ isAr ? 'عدد الحالات' : 'Cases' }}</div>
            </div>

            <template v-if="!loading">
              <template v-for="(items, cat) in grouped" :key="cat">
                <!-- Category row -->
                <div class="ct-cat-row">{{ cat }}</div>
                <!-- Service rows -->
                <div v-for="s in items" :key="s.id" class="ct-svc-row">
                  <div class="svc-name-cell">{{ svcName(s) }}</div>
                  <div class="dpc-num col-end price-cell">
                    {{ priceMap[s.id]?.price ? fmt(priceMap[s.id].price) : '—' }}
                  </div>
                  <div class="col-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      class="count-input"
                      :value="counts[s.id] || 0"
                      @input="counts[s.id] = parseInt($event.target.value) || 0"
                    />
                  </div>
                </div>
              </template>

              <!-- Empty state -->
              <div v-if="services.length === 0" class="ct-empty">
                <DpcIcon name="Stethoscope" :size="24" :stroke-width="1.4" />
                <p>{{ isAr ? 'لا توجد خدمات. أضف خدماتك أولاً.' : 'No services yet. Add your services first.' }}</p>
              </div>
            </template>

            <div v-else class="ct-loading">
              <DpcIcon name="Loader" :size="20" :stroke-width="1.6" class="spin" />
              {{ isAr ? 'جاري التحميل...' : 'Loading...' }}
            </div>
          </div>
        </div>

        <!-- Right: Results panel -->
        <div class="results-col">
          <!-- Metrics -->
          <div class="dpc-panel metrics-card">
            <div class="mini-eyebrow">{{ isAr ? 'ملخص الشهر' : 'Month summary' }}</div>
            <div class="metrics-grid">
              <div class="metric-item">
                <div class="metric-label">{{ isAr ? 'إجمالي الحالات' : 'Total cases' }}</div>
                <div class="dpc-num metric-value">{{ totalCases }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">{{ isAr ? 'الإيراد التقديري' : 'Est. revenue' }}</div>
                <div class="dpc-num metric-value">{{ totalCases > 0 ? fmt(estRevenue) : '—' }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">{{ isAr ? 'تكلفة الخامات' : 'Materials cost' }}</div>
                <div class="dpc-num metric-value">{{ totalCases > 0 ? fmt(matCost) : '—' }}</div>
              </div>
              <div class="metric-item metric-highlight">
                <div class="metric-label-hl">{{ isAr ? 'نسبة الخامات' : 'Materials %' }}</div>
                <div class="dpc-num metric-value-hl">{{ matPct !== null && totalCases > 0 ? matPct + '%' : '—' }}</div>
              </div>
            </div>
          </div>

          <!-- Save button -->
          <button
            class="dpc-btn dpc-btn-teal save-btn"
            :disabled="saving || totalCases === 0"
            @click="save"
          >
            <DpcIcon name="Save" :size="15" :stroke-width="1.8" />
            {{ saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ بيانات الشهر' : 'Save month data') }}
          </button>

          <!-- History -->
          <div class="dpc-panel history-card">
            <div class="history-header">{{ isAr ? 'السجل الشهري' : 'Monthly history' }}</div>
            <div v-if="history.length === 0" class="history-empty">
              {{ isAr ? 'لا توجد بيانات سابقة' : 'No previous data' }}
            </div>
            <div
              v-for="(h, i) in history" :key="h.month"
              :class="['history-row', i < history.length - 1 && 'history-border']"
            >
              <span class="history-month">{{ monthLabel(h.month) }}</span>
              <span class="dpc-num history-cases">{{ h.total_cases }} {{ isAr ? 'حالة' : 'cases' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AppShell>
</template>

<style scoped>
.page-header {
  padding: 22px 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  background: var(--paper); border-bottom: 1px solid var(--line);
}
.page-title { font-size: 24px; margin-bottom: 4px; }
.page-sub   { color: var(--ink-500); font-size: 13.5px; margin: 0; }
.header-actions { display: flex; gap: 8px; align-items: center; }

/* Lockout wall */
.lockout-wall {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 14px; padding: 56px 32px; max-width: 520px; margin: 0 auto;
}
.lockout-icon {
  width: 72px; height: 72px; border-radius: 18px;
  background: var(--teal-50); color: var(--teal-700);
  display: grid; place-items: center;
  box-shadow: inset 0 0 0 1.5px var(--teal-100);
}
.lockout-title { font-size: 22px; font-weight: 700; color: var(--ink-900); margin: 0; }
.lockout-body  { font-size: 14px; color: var(--ink-500); margin: 0; }
.lockout-features { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; width: 100%; max-width: 360px; }
.lockout-feature {
  display: flex; align-items: center; gap: 10px;
  font-size: 13.5px; color: var(--ink-700);
  color: var(--teal-700);
}
.lockout-btn { height: 44px; min-width: 200px; }

/* Month bar */
.month-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 28px; background: var(--surface); border-bottom: 1px solid var(--line);
}
.month-label  { font-size: 13px; font-weight: 600; color: var(--ink-700); }
.month-select {
  height: 36px; padding: 0 10px; border-radius: 8px;
  background: var(--paper); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px; border: none; outline: none; color: var(--ink-900);
  cursor: pointer;
}
.month-select:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }

/* Layout */
.ct-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 18px;
  padding: 18px 28px 32px;
  align-items: start;
}

/* Input card */
.input-card { overflow: hidden; }
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid var(--line);
}
.mini-eyebrow {
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-500);
}
.month-chip {
  font-size: 12px; font-weight: 500; color: var(--teal-700);
  padding: 3px 10px; border-radius: 999px;
  background: var(--teal-50); box-shadow: inset 0 0 0 1px var(--teal-100);
}

.ct-table-wrap { max-height: 60vh; overflow-y: auto; }

.ct-thead {
  display: grid; grid-template-columns: 1fr 110px 100px;
  padding: 10px 18px;
  background: var(--paper-2); border-bottom: 1px solid var(--line);
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-500);
  position: sticky; top: 0;
}
.ct-cat-row {
  padding: 8px 18px; font-size: 11px; font-weight: 700;
  color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.06em;
  background: var(--paper-2); border-bottom: 1px solid var(--line-2, #f0eeea);
}
.ct-svc-row {
  display: grid; grid-template-columns: 1fr 110px 100px;
  padding: 10px 18px; align-items: center;
  border-bottom: 1px solid var(--line-2, #f0eeea);
}
.ct-svc-row:last-child { border-bottom: none; }

.svc-name-cell { font-size: 13.5px; color: var(--ink-800); }
.price-cell    { font-size: 13px; color: var(--ink-600); }
.col-center    { text-align: center; }
.col-end       { text-align: end; }

.count-input {
  width: 72px; height: 32px; text-align: center; direction: ltr;
  border-radius: 7px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13.5px; font-weight: 600; border: none; outline: none;
  font-family: var(--font-mono);
}
.count-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }

.ct-empty, .ct-loading {
  padding: 40px; text-align: center; display: flex; flex-direction: column;
  align-items: center; gap: 10px; color: var(--ink-400); font-size: 13.5px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

/* Results column */
.results-col { display: flex; flex-direction: column; gap: 14px; }

.metrics-card { padding: 18px; }
.metrics-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;
}
.metric-item {
  padding: 12px; border-radius: 10px;
  background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line);
}
.metric-highlight {
  background: var(--teal-50); box-shadow: inset 0 0 0 1px var(--teal-100);
}
.metric-label    { font-size: 10.5px; color: var(--ink-500); margin-bottom: 4px; }
.metric-label-hl { font-size: 10.5px; color: var(--teal-700); margin-bottom: 4px; }
.metric-value    { font-size: 20px; font-weight: 600; color: var(--ink-900); }
.metric-value-hl { font-size: 20px; font-weight: 600; color: var(--teal-800); }

.save-btn { width: 100%; height: 44px; }

/* History */
.history-card { overflow: hidden; }
.history-header {
  padding: 14px 18px; font-size: 12.5px; font-weight: 600;
  color: var(--ink-700); border-bottom: 1px solid var(--line);
}
.history-empty {
  padding: 20px 18px; text-align: center; font-size: 13px; color: var(--ink-400);
}
.history-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px;
}
.history-border { border-bottom: 1px solid var(--line-2, #f0eeea); }
.history-month { font-size: 13px; color: var(--ink-700); }
.history-cases { font-size: 13px; font-weight: 600; color: var(--teal-700); }
</style>
