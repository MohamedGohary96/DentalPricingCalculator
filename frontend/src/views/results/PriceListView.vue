<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import DpcTable from '@/components/table/DpcTable.vue'
import DpcTableHead from '@/components/table/DpcTableHead.vue'
import DpcTableRow from '@/components/table/DpcTableRow.vue'
import DpcTableCell from '@/components/table/DpcTableCell.vue'
import DpcTableGroup from '@/components/table/DpcTableGroup.vue'
import PageHeader from '@/components/PageHeader.vue'
import AlertBanner from '@/components/AlertBanner.vue'
import SectionCard from '@/components/SectionCard.vue'
import { usePricingStore } from '@/stores/pricing.js'
import { useI18nStore } from '@/stores/i18n.js'
import { useRestriction } from '@/composables/useRestriction.js'
import DpcHealthScore from '@/components/DpcHealthScore.vue'
import axios from 'axios'

const router       = useRouter()
const pricingStore = usePricingStore()
const i18n         = useI18nStore()
const api          = axios.create({ withCredentials: true })
const { isTrial, isLockout } = useRestriction()

const isAr = computed(() => i18n.locale === 'ar')

// Per-row local overrides
const localMargins        = ref({})
const localCurrentPrices  = ref({})
const savingRow           = ref(null)

// Global profit simulator
const simMargin    = ref(40)
const globalVat    = ref(0)
const globalRound  = ref(5)
const applying     = ref(false)
const simExpanded  = ref(true)

const priceList = computed(() => pricingStore.priceList || [])

// Flat list with category header entries for v-for rendering
const groupedList = computed(() => {
  const grouped = {}
  const uncategorized = []
  priceList.value.forEach(p => {
    const cat = p.category_name
    if (cat) {
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(p)
    } else {
      uncategorized.push(p)
    }
  })
  const result = []
  Object.entries(grouped).forEach(([cat, items]) => {
    result.push({ _type: 'cat', name: cat, count: items.length })
    items.forEach(item => result.push({ _type: 'row', ...item }))
  })
  if (uncategorized.length > 0) {
    result.push({ _type: 'cat', name: isAr.value ? 'غير مصنّف' : 'Uncategorized', count: uncategorized.length })
    uncategorized.forEach(item => result.push({ _type: 'row', ...item }))
  }
  return result
})

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }

function svcName(s) {
  const en = s.name || s.service_name || ''
  return isAr.value ? (s.name_ar || en) : en
}

function effectiveMargin(row) {
  return localMargins.value[row.id] != null ? localMargins.value[row.id] : (row.profit_percent || 0)
}

function effectivePrice(row) {
  if (localMargins.value[row.id] == null) return row.rounded_price || 0
  const margin    = Math.min(Math.max(localMargins.value[row.id], 0), 99.99)
  const totalCost = row.total_cost || 0
  const round     = globalRound.value || 5
  const marginDivisor = 1 - margin / 100
  const priceBeforeVat = marginDivisor > 0 ? totalCost / marginDivisor : totalCost
  const raw       = priceBeforeVat * (1 + globalVat.value / 100)
  return Math.ceil(raw / round) * round
}

// % of current price that is profit (margin semantics): (price - cost) / price * 100
function currentPriceMargin(row) {
  const current = effectiveCurrentPrice(row)
  const cost    = row.total_cost || 0
  if (!current || !cost) return null
  return Math.round((current - cost) / current * 100)
}

function marginDelta(row) {
  const margin = currentPriceMargin(row)
  if (margin === null) return null
  return margin - effectiveMargin(row)
}

function marginBadgeCls(delta) {
  if (delta === null)   return 'margin-unset'
  if (delta >= 20)      return 'margin-above'
  if (delta >= -20)     return 'margin-on'
  if (delta >= -50)     return 'margin-low'
  return 'margin-neg'
}

function varianceDisplay(row) {
  const current = effectiveCurrentPrice(row)
  const ar = isAr.value
  const unset = { kind: 'unset', cls: 'var-unset', icon: 'Minus',
                  status: ar ? 'غير محدد' : 'Not set',
                  label: ar ? '— غير محدد' : '— Not set' }
  if (!current) return unset
  const calc = effectivePrice(row)
  if (!calc) return unset

  const diff = current - calc
  const pct  = Math.round((diff / calc) * 100)
  // Signed currency amount — proper Unicode minus, locale-aware digits
  const sign   = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const amount = Math.round(Math.abs(diff)).toLocaleString('en-US')
  const signed = `${sign}${currency.value} ${amount}`

  if (Math.abs(pct) <= 5) {
    return { kind: 'ok', cls: 'var-ok', icon: 'Check', signed, diff, pct,
             status: ar ? 'مطابق' : 'On target',
             label: ar ? `${signed} مطابق` : `${signed} on target` }
  }
  if (diff < 0) {
    return { kind: 'low', cls: 'var-under', icon: 'TrendingDown', signed, diff, pct,
             status: ar ? 'منخفض' : 'Underpriced',
             label: ar ? `${signed} منخفض` : `${signed} underpriced` }
  }
  return { kind: 'buffer', cls: 'var-over', icon: 'TrendingUp', signed, diff, pct,
           status: ar ? 'فائض' : 'Buffer',
           label: ar ? `${signed} فائض` : `${signed} buffer` }
}

function marginToMarkup(m) {
  const x = Math.min(Math.max(m || 0, 0), 99.99)
  return Math.round(x / (1 - x / 100))
}

function adjustMargin(id, delta) {
  const current = localMargins.value[id] ?? (priceList.value.find(r => r.id === id)?.profit_percent || 0)
  localMargins.value[id] = Math.max(0, Math.min(99, Math.round(current + delta)))
}

function setLocalMargin(id, val) {
  const n = parseInt(val)
  if (!isNaN(n)) localMargins.value[id] = Math.max(0, Math.min(99, n))
}

function effectiveCurrentPrice(row) {
  return localCurrentPrices.value[row.id] != null ? localCurrentPrices.value[row.id] : (row.current_price || 0)
}

function setLocalCurrentPrice(id, val) {
  const n = parseFloat(val)
  if (!isNaN(n) && n >= 0) localCurrentPrices.value[id] = n
  else if (val === '' || val === null) localCurrentPrices.value[id] = 0
}

function recalcSim() {
  priceList.value.forEach(row => { localMargins.value[row.id] = simMargin.value })
}


async function saveRowMargin(row) {
  savingRow.value = row.id
  try {
    const payload = {}
    if (localMargins.value[row.id] != null) {
      payload.use_default_profit = 0
      payload.custom_profit_percent = localMargins.value[row.id]
    }
    if (localCurrentPrices.value[row.id] != null) {
      payload.current_price = localCurrentPrices.value[row.id]
    }
    await api.put(`/api/services/${row.id}`, payload)
    await pricingStore.loadPriceList()
    delete localMargins.value[row.id]
    delete localCurrentPrices.value[row.id]
  } catch (e) { console.error(e) }
  savingRow.value = null
}

const hasUnsaved = computed(() =>
  Object.keys(localMargins.value).length > 0 || Object.keys(localCurrentPrices.value).length > 0
)

const modifiedCount = computed(() =>
  new Set([...Object.keys(localMargins.value), ...Object.keys(localCurrentPrices.value)]).size
)

const revenueImpact = computed(() => {
  let delta = 0
  priceList.value.forEach(row => {
    if (localMargins.value[row.id] != null) {
      delta += effectivePrice(row) - (row.rounded_price || 0)
    }
  })
  return delta
})

const pricingHealth = computed(() => {
  const set = priceList.value.filter(r => r.current_price > 0 && r.rounded_price > 0)
  if (!set.length) return 0
  const low = set.filter(r => r.current_price < r.rounded_price * 0.95)
  return Math.round((1 - low.length / set.length) * 100)
})

const currency = ref('EGP')
function fmtCurrency(n) {
  const abs = Math.abs(n)
  const sign = n >= 0 ? '+' : '-'
  return `${sign}${currency.value} ${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

async function saveAll() {
  applying.value = true
  try {
    const ids = new Set([
      ...Object.keys(localMargins.value),
      ...Object.keys(localCurrentPrices.value),
    ])
    await Promise.all([...ids].map(id => {
      const payload = {}
      if (localMargins.value[id] != null) {
        payload.use_default_profit = 0
        payload.custom_profit_percent = localMargins.value[id]
      }
      if (localCurrentPrices.value[id] != null) {
        payload.current_price = localCurrentPrices.value[id]
      }
      return api.put(`/api/services/${id}`, payload)
    }))
    localMargins.value = {}
    localCurrentPrices.value = {}
    await pricingStore.loadPriceList()
  } catch (e) { console.error(e) }
  applying.value = false
}

function exportCSV() {
  const headers = ['Service', 'Category', 'Base Cost', 'Doctor Fee', 'Lab Materials', 'Profit %', 'Calculated Price', 'Current Price', 'Variance']
  const rows = priceList.value.map(item => [
    svcName(item),
    item.category_name || '',
    item.base_cost || 0,
    item.doctor_fee || 0,
    item.lab_materials_cost || 0,
    effectiveMargin(item),
    effectivePrice(item),
    effectiveCurrentPrice(item),
    varianceDisplay(item).label
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `price-list-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  // Record timestamp of this price-list visit (used by DpcLastReview sidebar widget)
  localStorage.setItem('dpc_last_price_review', new Date().toISOString())

  await Promise.all([
    pricingStore.loadPriceList().catch(() => {}),
    pricingStore.loadSetupStatus().catch(() => {}),
  ])
  try {
    const { data } = await api.get('/api/settings/global')
    simMargin.value   = data.default_profit_percent || 40
    globalVat.value   = data.vat_percent || 0
    globalRound.value = data.rounding_nearest || 5
    currency.value    = data.currency || 'EGP'
  } catch {}
})
</script>

<template>
  <AppShell active-key="pricing">
    <!-- Premium page header -->
    <PageHeader
      :eyebrow="isAr ? 'قائمة الأسعار' : 'Price list'"
      :title="isAr ? 'أسعارك مبنية على التكلفة الحقيقية' : 'Your cost-based price list'"
      icon="Receipt"
      gradient
    >
      <template #actions>
        <DpcBtn variant="secondary" size="sm" icon="Download" @click="exportCSV">
          {{ isAr ? 'تصدير CSV' : 'Export CSV' }}
        </DpcBtn>
        <LangSwitch />
      </template>
    </PageHeader>

    <!-- Lockout wall -->
    <div v-if="isLockout" class="lockout-wall">
      <div class="lockout-icon"><DpcIcon name="Shield" :size="32" :stroke-width="1.4" /></div>
      <h3 class="lockout-title">{{ isAr ? 'انتهت التجربة المجانية' : 'Trial ended' }}</h3>
      <p class="lockout-body">{{ isAr ? 'قم بالترقية للوصول إلى قائمة الأسعار.' : 'Upgrade your subscription to access the price list.' }}</p>
      <button class="dpc-btn dpc-btn-teal" @click="router.push('/app/subscription')">{{ isAr ? 'عرض الخطط' : 'View plans' }}</button>
    </div>

    <div v-else class="pl-body">
      <!-- Premium trial banner -->
      <AlertBanner
        v-if="isTrial"
        variant="info"
        :message="isAr ? 'الأسعار مخفية في وضع التجربة. قم بالترقية لرؤية الأرقام الكاملة.' : 'Prices are blurred in trial mode. Upgrade to see full figures.'"
        icon="Info"
        class="animate-fade-in-down"
        style="margin-bottom: 20px;"
      />

      <!-- Premium Profit Simulator Panel -->
      <SectionCard
        :title="isAr ? 'محرر هامش الربح' : 'Profit Margin Editor'"
        icon="TrendingUp"
        :collapsible="true"
        :default-open="simExpanded"
        class="profit-simulator animate-fade-in-up"
        style="animation-delay: var(--stagger-1); margin-bottom: 20px;"
        @toggle="simExpanded = $event"
      >
        <div class="sim-body-content">
          <!-- Metric cards -->
          <div class="sim-metrics">
            <div class="sim-metric-card" :class="revenueImpact > 0 ? 'metric-positive' : revenueImpact < 0 ? 'metric-negative' : ''">
              <div class="metric-icon"><DpcIcon name="BarChart2" :size="16" :stroke-width="1.6" /></div>
              <div class="metric-label">{{ isAr ? 'تأثير الإيرادات' : 'Revenue Impact' }}</div>
              <div class="metric-value dpc-num">{{ fmtCurrency(revenueImpact) }}</div>
              <div class="metric-sub">{{ isAr ? 'من الخدمات المعدّلة' : 'from modified services' }}</div>
            </div>
            <div class="sim-metric-card sim-metric-card-health">
              <DpcHealthScore :score="pricingHealth" />
            </div>
            <div class="sim-metric-card">
              <div class="metric-icon"><DpcIcon name="PenLine" :size="16" :stroke-width="1.6" /></div>
              <div class="metric-label">{{ isAr ? 'الخدمات المعدّلة' : 'Modified Services' }}</div>
              <div class="metric-value dpc-num">{{ modifiedCount }}</div>
              <div class="metric-sub">{{ isAr ? 'تعديلات معلّقة' : 'changes pending' }}</div>
            </div>
          </div>

          <!-- Global margin row -->
          <div class="sim-global-row">
            <span class="sim-global-label">
              {{ isAr ? 'هامش عام:' : 'Global margin:' }}
              <strong class="dpc-num" style="color:var(--teal-700);margin-inline-start:4px;">{{ simMargin }}%</strong>
              <span
                v-if="simMargin > 0"
                class="markup-hint"
                :title="isAr ? 'نفس القيمة كنسبة فوق التكلفة' : 'Same value, as % added on top of cost'"
              >
                = {{ marginToMarkup(simMargin) }}% {{ isAr ? 'فوق التكلفة' : 'markup' }}
              </span>
            </span>
            <input type="range" min="0" max="99" step="1" v-model.number="simMargin" class="sim-slider" @input="recalcSim" />
            <button class="dpc-btn dpc-btn-outline sim-preview-btn" @click="recalcSim">
              {{ isAr ? 'معاينة' : 'Preview' }}
            </button>
          </div>

          <!-- Actions — shown only when there are unsaved changes -->
          <div v-if="hasUnsaved" class="sim-actions">
            <button class="dpc-btn sim-reset-btn" @click="localMargins = {}; localCurrentPrices = {}">
              <DpcIcon name="RotateCcw" :size="13" :stroke-width="1.8" />
              {{ isAr ? 'إعادة تعيين الكل' : 'Reset All Changes' }}
            </button>
            <button class="dpc-btn dpc-btn-teal sim-save-btn" :disabled="applying" @click="saveAll">
              <DpcIcon :name="applying ? 'Loader' : 'Save'" :size="13" :stroke-width="1.8" />
              {{ applying ? '...' : (isAr ? 'حفظ كل التغييرات' : 'Save All Changes') }}
            </button>
          </div>
        </div>
      </SectionCard>

      <!-- Premium Table -->
      <DpcTable
        class="price-list-table animate-fade-in-up"
        :empty="priceList.length === 0"
        empty-icon="Receipt"
        :empty-message="isAr ? 'أضف خدمات أولاً لتوليد قائمة الأسعار.' : 'Add services first to generate a price list.'"
        min-width="1100px"
        style="animation-delay: var(--stagger-2);"
      >
        <div class="price-list-grid">
          <!-- Column group header row -->
          <DpcTableHead>
            <DpcTableRow variant="header">
              <DpcTableCell type="header" class="col-g-service">{{ isAr ? 'الخدمة' : 'Service' }}</DpcTableCell>
              <DpcTableCell type="header" class="col-g-cost" style="grid-column: span 4">{{ isAr ? 'تفاصيل التكلفة' : 'Cost breakdown' }}</DpcTableCell>
              <DpcTableCell type="header" class="col-g-profit">{{ isAr ? 'الربح' : 'Profit' }}</DpcTableCell>
              <DpcTableCell type="header" class="col-g-price" style="grid-column: span 3">{{ isAr ? 'التسعير' : 'Pricing' }}</DpcTableCell>
              <DpcTableCell type="header" class="col-g-var">{{ isAr ? 'الفرق' : 'Variance' }}</DpcTableCell>
              <DpcTableCell type="header"></DpcTableCell>
            </DpcTableRow>

            <!-- Sub-header row -->
            <DpcTableRow variant="header">
              <DpcTableCell type="header">{{ isAr ? 'اسم الخدمة' : 'Service name' }}</DpcTableCell>
              <DpcTableCell type="header" align="end">{{ isAr ? 'التكلفة الأساسية' : 'Base cost' }}</DpcTableCell>
              <DpcTableCell type="header" align="end">{{ isAr ? 'أتعاب الطبيب' : 'Doctor fee' }}</DpcTableCell>
              <DpcTableCell type="header" align="center">{{ isAr ? 'نوع الأتعاب' : 'Fee type' }}</DpcTableCell>
              <DpcTableCell type="header" align="end">{{ isAr ? 'خامات المعمل' : 'Lab materials' }}</DpcTableCell>
              <DpcTableCell type="header" align="center">{{ isAr ? 'هامش الربح %' : 'Profit %' }}</DpcTableCell>
              <DpcTableCell type="header" align="end">{{ isAr ? 'السعر المحسوب' : 'Calc. price' }}</DpcTableCell>
              <DpcTableCell type="header" align="end">{{ isAr ? 'سعرك الحالي' : 'Current price' }}</DpcTableCell>
              <DpcTableCell type="header" align="center">{{ isAr ? 'هامش السعر الحالي' : 'Current margin' }}</DpcTableCell>
              <DpcTableCell type="header" align="center">{{ isAr ? 'الفرق' : 'Variance' }}</DpcTableCell>
              <DpcTableCell type="header"></DpcTableCell>
            </DpcTableRow>
          </DpcTableHead>

          <!-- Rows -->
          <template v-for="item in groupedList" :key="item._type === 'cat' ? 'cat-' + item.name : item.id">
            <!-- Category header -->
            <DpcTableGroup
              v-if="item._type === 'cat'"
              :label="item.name"
              :count="item.count"
              icon="Folder"
            />

            <!-- Data row -->
            <DpcTableRow
              v-else
              :class="[
                (item.current_price && effectivePrice(item) > item.current_price * 1.05) && 'row-under',
                localMargins[item.id] != null && 'row-changed'
              ]"
            >
              <!-- Service name -->
              <DpcTableCell type="text">
                <div class="svc-cell">
                  <div class="svc-icon"><DpcIcon name="Stethoscope" :size="13" :stroke-width="1.7" /></div>
                  <div>
                    <div class="svc-name">{{ svcName(item) }}</div>
                    <div v-if="item.category_name" class="svc-cat">{{ item.category_name }}</div>
                  </div>
                </div>
              </DpcTableCell>

              <!-- Base cost -->
              <DpcTableCell type="number" align="end">
                <span :class="isTrial && 'trial-blur'">{{ fmt(item.base_cost || 0) }}</span>
              </DpcTableCell>

              <!-- Doctor fee -->
              <DpcTableCell type="number" align="end">
                <span :class="isTrial && 'trial-blur'">
                  {{ item.doctor_fee > 0 ? fmt(item.doctor_fee) : '—' }}
                </span>
              </DpcTableCell>

              <!-- Doctor fee type badge -->
              <DpcTableCell type="status" align="center">
                <span
                  class="fee-badge"
                  :class="{
                    'fee-hourly':  item.doctor_fee_type === 'hourly',
                    'fee-fixed':   item.doctor_fee_type === 'fixed',
                    'fee-pct':     item.doctor_fee_type === 'percentage'
                  }"
                >
                  <template v-if="item.doctor_fee_type === 'hourly'">{{ isAr ? 'بالساعة' : 'Hourly' }}</template>
                  <template v-else-if="item.doctor_fee_type === 'fixed'">{{ isAr ? 'ثابت' : 'Fixed' }}</template>
                  <template v-else>{{ item.doctor_percentage || 0 }}%</template>
                </span>
              </DpcTableCell>

              <!-- Lab materials -->
              <DpcTableCell type="number" align="end">
                <span :class="isTrial && 'trial-blur'">
                  {{ item.lab_materials_cost > 0 ? fmt(item.lab_materials_cost) : '—' }}
                </span>
              </DpcTableCell>

              <!-- Profit % control -->
              <DpcTableCell type="action" align="center">
                <div class="margin-ctrl" :class="isTrial && 'trial-blur'">
                  <button class="mq-btn" @click="adjustMargin(item.id, -5)">-5</button>
                  <input
                    type="number"
                    :value="effectiveMargin(item)"
                    class="mq-input"
                    min="0"
                    max="99"
                    @change="setLocalMargin(item.id, $event.target.value)"
                  />
                  <span class="mq-pct">%</span>
                  <button class="mq-btn" @click="adjustMargin(item.id, +5)">+5</button>
                </div>
                <span
                  v-if="effectiveMargin(item) > 0"
                  class="markup-hint markup-hint-row"
                  :title="isAr ? 'نفس القيمة كنسبة فوق التكلفة' : 'Same value, as % added on top of cost'"
                >
                  = {{ marginToMarkup(effectiveMargin(item)) }}% {{ isAr ? 'فوق' : 'markup' }}
                </span>
              </DpcTableCell>

              <!-- Calculated price -->
              <DpcTableCell type="number" align="end">
                <strong class="price-val" :class="[isTrial && 'trial-blur', localMargins[item.id] != null && 'price-changed']">
                  {{ fmt(effectivePrice(item)) }}
                </strong>
              </DpcTableCell>

              <!-- Current price (inline editable) -->
              <DpcTableCell type="action" align="end">
                <div class="current-price-ctrl" :class="[isTrial && 'trial-blur', localCurrentPrices[item.id] != null && 'price-changed']">
                  <input
                    type="number"
                    :value="effectiveCurrentPrice(item) || ''"
                    class="cp-input"
                    :placeholder="isAr ? 'أدخل' : 'Enter'"
                    min="0"
                    @change="setLocalCurrentPrice(item.id, $event.target.value)"
                  />
                </div>
              </DpcTableCell>

              <!-- Current price margin badge -->
              <DpcTableCell type="status" align="center">
                <span :class="['margin-badge', isTrial && 'trial-blur', marginBadgeCls(marginDelta(item))]">
                  <template v-if="currentPriceMargin(item) !== null">
                    <span class="margin-main">{{ currentPriceMargin(item) }}%</span>
                  </template>
                  <template v-else>—</template>
                </span>
                <span
                  v-if="currentPriceMargin(item) !== null && currentPriceMargin(item) > 0"
                  class="markup-hint markup-hint-row"
                  :title="isAr ? 'نفس القيمة كنسبة فوق التكلفة' : 'Same value, as % added on top of cost'"
                >
                  = {{ marginToMarkup(currentPriceMargin(item)) }}% {{ isAr ? 'فوق' : 'markup' }}
                </span>
              </DpcTableCell>

              <!-- Variance -->
              <DpcTableCell type="status" align="center">
                <span
                  v-bind:class="['var-chip', isTrial && 'trial-blur', varianceDisplay(item).cls]"
                  :title="varianceDisplay(item).status"
                >
                  <DpcIcon :name="varianceDisplay(item).icon" :size="12" :stroke-width="2" class="var-icon" />
                  <span v-if="varianceDisplay(item).signed" class="var-num">{{ varianceDisplay(item).signed }}</span>
                  <span class="var-status">{{ varianceDisplay(item).status }}</span>
                </span>
              </DpcTableCell>

              <!-- Save row button -->
              <DpcTableCell type="action" align="center">
                <button
                  v-if="localMargins[item.id] != null || localCurrentPrices[item.id] != null"
                  class="save-row-btn"
                  :disabled="savingRow === item.id"
                  @click="saveRowMargin(item)"
                  :title="isAr ? 'حفظ' : 'Save'"
                >
                  <DpcIcon :name="savingRow === item.id ? 'Loader' : 'Save'" :size="13" :stroke-width="1.7" />
                </button>
              </DpcTableCell>
            </DpcTableRow>
          </template>
        </div>
      </DpcTable>

      <!-- Premium variance legend -->
      <div class="variance-legend animate-fade-in-up" style="animation-delay: var(--stagger-3);">
        <div class="legend-item" style="animation-delay: var(--stagger-1);">
          <span class="var-chip var-under">
            <DpcIcon name="TrendingDown" :size="12" :stroke-width="2" class="var-icon" />
            <span class="var-status">{{ isAr ? 'منخفض' : 'Underpriced' }}</span>
          </span>
          <p>{{ isAr ? 'سعرك الحالي أقل من السعر المحسوب بأكثر من ٥٪ — يُفضَّل رفع السعر.' : 'Your current price is more than 5% below the calculated price — consider raising it.' }}</p>
        </div>
        <div class="legend-item" style="animation-delay: var(--stagger-2);">
          <span class="var-chip var-ok">
            <DpcIcon name="Check" :size="12" :stroke-width="2" class="var-icon" />
            <span class="var-status">{{ isAr ? 'مطابق' : 'On target' }}</span>
          </span>
          <p>{{ isAr ? 'سعرك ضمن ٥٪ من السعر المحسوب.' : 'Your price is within 5% of the calculated price.' }}</p>
        </div>
        <div class="legend-item" style="animation-delay: var(--stagger-3);">
          <span class="var-chip var-over">
            <DpcIcon name="TrendingUp" :size="12" :stroke-width="2" class="var-icon" />
            <span class="var-status">{{ isAr ? 'فائض' : 'Buffer' }}</span>
          </span>
          <p>{{ isAr ? 'سعرك أعلى من السعر المحسوب بأكثر من ٥٪ — لديك هامش إضافي.' : 'Your price is more than 5% above the calculated price — you have extra buffer.' }}</p>
        </div>
      </div>
    </div>

    <!-- Premium sticky save bar -->
    <Transition name="save-bar">
      <div v-if="!isLockout && hasUnsaved" class="save-bar">
        <div class="save-bar-content">
          <div class="save-bar-text">
            <DpcIcon name="AlertCircle" :size="16" :stroke-width="1.8" />
            <span>{{ isAr ? `${modifiedCount} خدمة بتعديلات غير محفوظة` : `${modifiedCount} service(s) with unsaved changes` }}</span>
          </div>
          <div class="save-bar-impact" v-if="revenueImpact !== 0">
            <span class="impact-label">{{ isAr ? 'تأثير الإيرادات:' : 'Revenue impact:' }}</span>
            <span class="impact-value dpc-num" :class="revenueImpact > 0 ? 'impact-positive' : 'impact-negative'">
              {{ fmtCurrency(revenueImpact) }}
            </span>
          </div>
        </div>
        <div class="save-bar-actions">
          <DpcBtn variant="ghost" size="md" @click="localMargins = {}; localCurrentPrices = {}" style="color:rgba(255,255,255,0.9);">
            {{ isAr ? 'تجاهل' : 'Discard' }}
          </DpcBtn>
          <DpcBtn variant="teal" size="md" :disabled="applying" @click="saveAll">
            <DpcIcon :name="applying ? 'Loader' : 'Save'" :size="14" :stroke-width="1.8" />
            {{ isAr ? 'حفظ الكل' : 'Save All' }}
          </DpcBtn>
        </div>
      </div>
    </Transition>
  </AppShell>
</template>

<style scoped>
/* ── Premium layout ───────────────────────────────────────── */
.pl-body  { padding: 20px 28px 100px; }

/* ── Premium simulator ────────────────────────────────────── */
.trial-blur  { filter: blur(5px); user-select: none; pointer-events: none; }

.sim-body-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sim-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.sim-metric-card {
  padding: 16px 18px;
  border-radius: var(--radius-md);
  background: var(--paper);
  box-shadow: inset 0 0 0 1px var(--line);
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: all var(--duration-fast);
}

.sim-metric-card:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 1px var(--line-strong), 0 4px 12px rgba(0, 0, 0, 0.08);
}

.sim-metric-card.metric-positive {
  box-shadow: inset 0 0 0 1.5px var(--teal-200);
  background: var(--teal-50);
}

.sim-metric-card.metric-positive:hover {
  box-shadow: inset 0 0 0 1.5px var(--teal-300), 0 4px 12px rgba(20, 184, 166, 0.15);
}

.sim-metric-card.metric-negative {
  box-shadow: inset 0 0 0 1.5px var(--danger-200, #fca5a5);
  background: var(--danger-50, #fff1f2);
  animation: pulse-danger 2s ease-in-out infinite;
}

@keyframes pulse-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.sim-metric-card-health {
  padding: 0;
  overflow: hidden;
}

.sim-metric-card-health :deep(.hs-root) {
  border-radius: var(--radius-md);
  box-shadow: none;
}

.metric-icon {
  color: var(--ink-500);
  margin-bottom: 4px;
}

.metric-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--ink-500);
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
}

.metric-positive .metric-value {
  color: var(--teal-700);
}

.metric-negative .metric-value {
  color: var(--danger-600);
}

.metric-sub {
  font-size: 11px;
  color: var(--ink-400);
}

.sim-global-row { display: flex; align-items: center; gap: 12px; }
.sim-global-label { font-size: 13px; color: var(--ink-700); white-space: nowrap; flex: none; }
/* Markup-equivalent hint — minimal supplementary text, no chrome. */
.markup-hint {
  color: var(--ink-500);
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
  cursor: help;
  margin-inline-start: 6px;
}
.markup-hint-row {
  display: block;
  margin: 2px 0 0;
  font-size: 10.5px;
  text-align: center;
}
.sim-slider { flex: 1; accent-color: var(--teal-600); cursor: pointer; }
.sim-preview-btn { height: 34px; font-size: 12.5px; padding: 0 14px; }

.sim-actions { display: flex; gap: 10px; }
.sim-reset-btn {
  display: flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 14px; font-size: 12.5px;
  background: var(--paper-2); color: var(--ink-700);
  box-shadow: inset 0 0 0 1px var(--line);
}
.sim-reset-btn:hover { background: var(--danger-50, #fff1f2); color: var(--danger-600); box-shadow: inset 0 0 0 1px var(--danger-200, #fca5a5); }
.sim-save-btn { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; font-size: 12.5px; }

/* ── Premium Table ────────────────────────────────────────── */
.price-list-table {
  background: var(--surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* 11-column grid: name | base_cost | dr_fee | fee_type | lab | profit% | calc_price | current | current_margin | variance | save */
.price-list-grid {
  display: grid;
  grid-template-columns: minmax(180px,2fr) 90px 90px 90px 90px 170px 100px 100px 100px 120px 44px;
  align-items: center;
  width: 100%;
}

/* Premium row hover effects */
.price-list-grid :deep(.dpc-table-row:not(.dpc-table-row--header):not(.dpc-table-group)) {
  transition: all var(--duration-fast);
  position: relative;
}

.price-list-grid :deep(.dpc-table-row:not(.dpc-table-row--header):not(.dpc-table-group):hover) {
  background: var(--paper-2);
  transform: translateX(2px);
  box-shadow: -3px 0 0 0 var(--teal-600) inset;
}

/* Group header row styling */
.col-g-service,
.col-g-cost,
.col-g-profit,
.col-g-price,
.col-g-var {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-500);
  padding: 10px 20px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
}
.col-g-service { grid-column: 1; }
.col-g-cost    { grid-column: 2 / 6; text-align: center; border-inline: 1px solid var(--line-2, #eee); padding-block: 4px; }
.col-g-profit  { grid-column: 6; text-align: center; }
.col-g-price   { grid-column: 7 / 10; text-align: center; border-inline: 1px solid var(--line-2, #eee); }
.col-g-var     { grid-column: 10; text-align: center; }
.col-g-act     { grid-column: 11; }

/* Row state modifiers */
.row-under   { background: rgba(245,158,11,.04); }
.row-changed {
  background: rgba(20,184,166,.03);
  animation: pulse-success 600ms var(--ease-out-expo);
}

@keyframes pulse-success {
  0%, 100% { background: transparent; }
  50% { background: rgba(20,184,166,.08); }
}

.t-sm       { font-size: 12.5px; color: var(--ink-700); }
.text-faint { color: var(--ink-400); }

.svc-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.svc-icon {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md);
  flex: none;
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--teal-100);
  transition: all var(--duration-fast);
}

.price-list-grid :deep(.dpc-table-row:hover) .svc-icon {
  background: var(--teal-100);
  box-shadow: inset 0 0 0 1px var(--teal-200), 0 2px 4px rgba(20, 184, 166, 0.15);
  transform: scale(1.05);
}

.svc-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--duration-fast);
}

.price-list-grid :deep(.dpc-table-row:hover) .svc-name {
  color: var(--teal-700);
}

.svc-cat {
  font-size: 11px;
  color: var(--ink-500);
}

/* Doctor fee type badge */
.fee-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.fee-hourly { background: var(--paper-2);           color: var(--ink-600); }
.fee-fixed  { background: var(--teal-50);            color: var(--teal-700); }
.fee-pct    { background: rgba(124,58,237,.08);      color: #7C3AED; }

/* Margin control - polished with hover acceleration */
.margin-ctrl { display: flex; align-items: center; gap: 4px; justify-content: center; }
.mq-btn {
  width: 26px; height: 26px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: var(--paper-2); color: var(--ink-700);
  box-shadow: inset 0 0 0 1px var(--line); cursor: pointer;
  display: grid; place-items: center;
  transition:
    background 150ms var(--ease-out-expo),
    color 150ms var(--ease-out-expo),
    box-shadow 150ms var(--ease-out-expo),
    transform 150ms var(--ease-out-expo);
}
.mq-btn:hover {
  background: var(--teal-50);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1px var(--teal-400), 0 2px 6px rgba(6,182,212,0.15);
  transform: translateY(-1px) scale(1.08);
}
.mq-btn:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 50ms;
}
.mq-input {
  width: 48px; height: 26px; padding: 0 4px; text-align: center; direction: ltr;
  border-radius: 6px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 12px; font-family: var(--font-mono); font-weight: 600; border: none; outline: none;
  transition: box-shadow 150ms var(--ease-out-expo);
}
.mq-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }
.mq-pct { font-size: 11px; color: var(--ink-500); }

/* Calculated price */
.price-val     { font-size: 13.5px; font-weight: 600; color: var(--ink-900); }
.price-changed { color: var(--teal-700); }

/* Current price inline input */
.current-price-ctrl { display: flex; align-items: center; justify-content: flex-end; }
.current-price-ctrl.price-changed .cp-input { box-shadow: inset 0 0 0 1.5px var(--teal-600); color: var(--teal-700); }
.cp-input {
  width: 72px; height: 26px; padding: 0 6px; text-align: end; direction: ltr;
  border-radius: 6px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 12px; font-family: var(--font-mono); font-weight: 600; border: none; outline: none;
  transition: box-shadow 150ms var(--ease-out-expo);
}
.cp-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }

/* Save row button */
.save-row-btn {
  width: 30px; height: 30px; border-radius: 7px;
  background: var(--teal-600); color: #fff;
  display: grid; place-items: center; cursor: pointer;
}
.save-row-btn:hover:not(:disabled) { background: var(--teal-700); }
.save-row-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Current price margin badge */
.margin-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.margin-main  { font-size: 11px; font-weight: 700; }
.margin-unset { background: var(--paper-2);               color: var(--ink-400); }
.margin-above { background: rgba(59,130,246,.08);          color: #1d4ed8; }
.margin-on    { background: var(--teal-50);                color: var(--teal-700); }
.margin-low   { background: var(--warning-50);             color: var(--warning-700); }
.margin-neg   { background: var(--danger-50, #fff1f2);     color: var(--danger-600, #dc2626); }

/* Variance chip — icon + signed % + small status word, color-coded by kind */
.var-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 999px;
  white-space: nowrap;
  line-height: 1;
  border: 1px solid transparent;
}
.var-chip .var-icon { flex: none; }
.var-chip .var-num { font-variant-numeric: tabular-nums; letter-spacing: 0; }
.var-chip .var-status { font-size: 10px; font-weight: 500; opacity: 0.9; letter-spacing: 0.1px; }

.var-unset { background: var(--ink-50);     color: var(--ink-500);     border-color: var(--ink-100); }
.var-ok    { background: var(--teal-50);    color: var(--teal-700);    border-color: var(--teal-100); }
.var-under { background: var(--warning-50); color: var(--warning-700); border-color: var(--warning-100); }
.var-over  { background: var(--info-50);    color: var(--info-700);    border-color: var(--info-100); }

/* ── Premium variance legend ──────────────────────────────── */
.variance-legend {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 24px;
  padding: 24px;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line), 0 2px 8px rgba(0, 0, 0, 0.04);
}

.legend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--paper);
  transition: all var(--duration-fast);
  animation: fade-in var(--duration-base) var(--ease-out-expo) backwards;
}

.legend-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.legend-item p {
  font-size: 12.5px;
  color: var(--ink-600);
  margin: 0;
  line-height: 1.5;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Premium sticky save bar ──────────────────────────────── */
.save-bar {
  position: sticky;
  bottom: 0;
  padding: 18px 28px;
  background: linear-gradient(135deg, var(--ink-900), var(--navy-900));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  z-index: 50;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.save-bar-content {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

.save-bar-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,.95);
}

.save-bar-impact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.impact-label {
  font-size: 12px;
  color: rgba(255,255,255,0.75);
}

.impact-value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.impact-positive {
  color: var(--teal-300);
}

.impact-negative {
  color: var(--danger-300);
}

.save-bar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* Save bar animations */
.save-bar-enter-active,
.save-bar-leave-active {
  transition: all 0.3s var(--ease-out-expo);
}

.save-bar-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.save-bar-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* Empty state */
.empty-state { padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; color: var(--ink-400); }
.empty-icon  { color: var(--ink-300); }
.empty-state p { font-size: 14px; margin: 0; }

/* ── Lockout wall ─────────────────────────────────────────── */
.lockout-wall {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 400px;
  text-align: center;
  padding: 40px;
  animation: fade-in 0.4s var(--ease-out-expo);
}

.lockout-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: var(--paper-2);
  color: var(--ink-400);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--line);
  animation: scale-in 0.5s var(--ease-bounce);
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.lockout-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0;
}

.lockout-body {
  font-size: 14px;
  color: var(--ink-500);
  max-width: 360px;
  margin: 0;
  line-height: 1.6;
}
</style>
