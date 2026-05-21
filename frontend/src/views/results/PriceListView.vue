<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { usePricingStore } from '@/stores/pricing.js'
import { useI18nStore } from '@/stores/i18n.js'
import { useRestriction } from '@/composables/useRestriction.js'
import axios from 'axios'

const router       = useRouter()
const pricingStore = usePricingStore()
const i18n         = useI18nStore()
const api          = axios.create({ withCredentials: true })
const { isTrial, isLockout } = useRestriction()

const isAr = computed(() => i18n.locale === 'ar')

// Per-row local margin overrides — id → profit_percent
const localMargins = ref({})
const savingRow    = ref(null)

// Global profit simulator
const simMargin    = ref(40)
const globalVat    = ref(0)
const globalRound  = ref(5)
const applying     = ref(false)

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
  return isAr.value ? (s.name_ar || s.name || '') : (s.name || s.name_ar || '')
}

function effectiveMargin(row) {
  return localMargins.value[row.id] != null ? localMargins.value[row.id] : (row.profit_percent || 0)
}

function effectivePrice(row) {
  if (localMargins.value[row.id] == null) return row.rounded_price || 0
  const margin    = localMargins.value[row.id]
  const totalCost = row.total_cost || 0
  const round     = globalRound.value || 5
  const raw       = totalCost * (1 + margin / 100) * (1 + globalVat.value / 100)
  return Math.ceil(raw / round) * round
}

function varianceDisplay(row) {
  const current = row.current_price
  if (!current) return { label: isAr.value ? 'غير محدد' : 'Not set', cls: 'var-unset' }
  const v   = effectivePrice(row) - current
  const pct = Math.round((v / current) * 100)
  if (Math.abs(pct) <= 5) return { label: `✓ ${pct >= 0 ? '+' : ''}${pct}%`, cls: 'var-ok' }
  if (v > 0)              return { label: `↑ +${fmt(v)}`, cls: 'var-under' }
  return { label: `+${fmt(Math.abs(v))} buffer`, cls: 'var-over' }
}

function adjustMargin(id, delta) {
  const current = localMargins.value[id] ?? (priceList.value.find(r => r.id === id)?.profit_percent || 0)
  localMargins.value[id] = Math.max(-100, Math.min(500, Math.round(current + delta)))
}

function setLocalMargin(id, val) {
  const n = parseInt(val)
  if (!isNaN(n)) localMargins.value[id] = Math.max(-100, Math.min(500, n))
}

function recalcSim() {
  priceList.value.forEach(row => { localMargins.value[row.id] = simMargin.value })
}

async function applySimToAll() {
  applying.value = true
  try {
    await Promise.all(
      priceList.value.map(row =>
        api.put(`/api/services/${row.id}`, {
          use_default_profit: 0,
          custom_profit_percent: simMargin.value,
        })
      )
    )
    localMargins.value = {}
    await pricingStore.loadPriceList()
  } catch (e) { console.error(e) }
  applying.value = false
}

async function saveRowMargin(row) {
  savingRow.value = row.id
  try {
    await api.put(`/api/services/${row.id}`, {
      use_default_profit: 0,
      custom_profit_percent: localMargins.value[row.id],
    })
    await pricingStore.loadPriceList()
    delete localMargins.value[row.id]
  } catch (e) { console.error(e) }
  savingRow.value = null
}

const hasUnsaved = computed(() => Object.keys(localMargins.value).length > 0)

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
  } catch {}
})
</script>

<template>
  <AppShell active-key="pricing">
    <!-- Page header -->
    <div class="pl-topbar">
      <div>
        <div class="eyebrow-teal">{{ isAr ? 'قائمة الأسعار' : 'Price list' }}</div>
        <h1 class="dpc-h pl-title">{{ isAr ? 'أسعارك مبنية على التكلفة الحقيقية' : 'Your cost-based price list' }}</h1>
      </div>
      <div class="pl-topbar-actions">
        <LangSwitch />
      </div>
    </div>

    <!-- Lockout wall -->
    <div v-if="isLockout" class="lockout-wall">
      <div class="lockout-icon"><DpcIcon name="Shield" :size="32" :stroke-width="1.4" /></div>
      <h3 class="lockout-title">{{ isAr ? 'انتهت التجربة المجانية' : 'Trial ended' }}</h3>
      <p class="lockout-body">{{ isAr ? 'قم بالترقية للوصول إلى قائمة الأسعار.' : 'Upgrade your subscription to access the price list.' }}</p>
      <button class="dpc-btn dpc-btn-teal" @click="router.push('/app/subscription')">{{ isAr ? 'عرض الخطط' : 'View plans' }}</button>
    </div>

    <div v-else class="pl-body">
      <!-- Trial banner -->
      <div v-if="isTrial" class="trial-banner">
        <DpcIcon name="Info" :size="15" :stroke-width="1.6" />
        {{ isAr ? 'الأسعار مخفية في وضع التجربة. قم بالترقية لرؤية الأرقام الكاملة.' : 'Prices are blurred in trial mode. Upgrade to see full figures.' }}
      </div>

      <!-- Profit Simulator -->
      <div class="simulator-bar">
        <div class="sim-label">
          <DpcIcon name="TrendingUp" :size="14" :stroke-width="1.6" />
          {{ isAr ? 'محاكي الربح:' : 'Profit simulator:' }}
          <strong class="dpc-num sim-pct">{{ simMargin }}%</strong>
        </div>
        <input type="range" min="0" max="200" step="1" v-model.number="simMargin" class="sim-slider" @input="recalcSim" />
        <button class="dpc-btn dpc-btn-teal" style="height:36px;font-size:12.5px;padding:0 14px;" :disabled="applying" @click="applySimToAll">
          {{ applying ? '...' : (isAr ? 'تطبيق على الكل' : 'Apply to all') }}
        </button>
      </div>

      <!-- Table -->
      <div class="dpc-panel table-outer">
        <div class="table-scroll">
          <!-- Column group header row -->
          <div class="table-head col-group-head">
            <div class="col-g-service">{{ isAr ? 'الخدمة' : 'Service' }}</div>
            <div class="col-g-cost">{{ isAr ? 'تفاصيل التكلفة' : 'Cost breakdown' }}</div>
            <div class="col-g-profit">{{ isAr ? 'الربح' : 'Profit' }}</div>
            <div class="col-g-price">{{ isAr ? 'التسعير' : 'Pricing' }}</div>
            <div class="col-g-var">{{ isAr ? 'الفرق' : 'Variance' }}</div>
            <div class="col-g-act"></div>
          </div>
          <!-- Sub-header row -->
          <div class="table-head col-sub-head">
            <div>{{ isAr ? 'اسم الخدمة' : 'Service name' }}</div>
            <div class="col-end">{{ isAr ? 'التكلفة الأساسية' : 'Base cost' }}</div>
            <div class="col-end">{{ isAr ? 'أتعاب الطبيب' : 'Doctor fee' }}</div>
            <div class="col-center">{{ isAr ? 'نوع الأتعاب' : 'Fee type' }}</div>
            <div class="col-end">{{ isAr ? 'خامات المختبر' : 'Lab materials' }}</div>
            <div class="col-center">{{ isAr ? 'هامش الربح %' : 'Profit %' }}</div>
            <div class="col-end">{{ isAr ? 'السعر المحسوب' : 'Calc. price' }}</div>
            <div class="col-end">{{ isAr ? 'سعرك الحالي' : 'Current price' }}</div>
            <div class="col-center">{{ isAr ? 'الفرق' : 'Variance' }}</div>
            <div></div>
          </div>

          <!-- Empty state -->
          <div v-if="priceList.length === 0" class="empty-state">
            <DpcIcon name="Receipt" :size="32" :stroke-width="1.3" class="empty-icon" />
            <p>{{ isAr ? 'أضف خدمات أولاً لتوليد قائمة الأسعار.' : 'Add services first to generate a price list.' }}</p>
          </div>

          <!-- Rows -->
          <template v-for="item in groupedList" :key="item._type === 'cat' ? 'cat-' + item.name : item.id">
            <!-- Category header -->
            <div v-if="item._type === 'cat'" class="cat-header">
              <DpcIcon name="Folder" :size="13" :stroke-width="1.6" />
              {{ item.name }}
              <span class="cat-count">{{ item.count }} {{ isAr ? 'خدمة' : 'services' }}</span>
            </div>

            <!-- Data row -->
            <div
              v-else
              :class="['table-row', 'data-row',
                (item.current_price && effectivePrice(item) > item.current_price * 1.05) && 'row-under',
                localMargins[item.id] != null && 'row-changed'
              ]"
            >
              <!-- Service name -->
              <div class="svc-cell">
                <div class="svc-icon"><DpcIcon name="Stethoscope" :size="13" :stroke-width="1.7" /></div>
                <div>
                  <div class="svc-name">{{ svcName(item) }}</div>
                  <div v-if="item.category_name" class="svc-cat">{{ item.category_name }}</div>
                </div>
              </div>

              <!-- Base cost -->
              <div class="dpc-num col-end t-sm" :class="isTrial && 'trial-blur'">
                {{ fmt(item.base_cost || 0) }}
              </div>

              <!-- Doctor fee -->
              <div class="dpc-num col-end t-sm" :class="isTrial && 'trial-blur'">
                {{ item.doctor_fee > 0 ? fmt(item.doctor_fee) : '—' }}
              </div>

              <!-- Doctor fee type badge -->
              <div class="col-center">
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
              </div>

              <!-- Lab materials -->
              <div class="dpc-num col-end t-sm" :class="isTrial && 'trial-blur'">
                {{ item.lab_materials_cost > 0 ? fmt(item.lab_materials_cost) : '—' }}
              </div>

              <!-- Profit % control -->
              <div class="col-center margin-ctrl" :class="isTrial && 'trial-blur'">
                <button class="mq-btn" @click="adjustMargin(item.id, -5)">-5</button>
                <input
                  type="number"
                  :value="effectiveMargin(item)"
                  class="mq-input"
                  @change="setLocalMargin(item.id, $event.target.value)"
                />
                <span class="mq-pct">%</span>
                <button class="mq-btn" @click="adjustMargin(item.id, +5)">+5</button>
              </div>

              <!-- Calculated price -->
              <div class="col-end" :class="isTrial && 'trial-blur'">
                <strong class="dpc-num price-val" :class="localMargins[item.id] != null && 'price-changed'">
                  {{ fmt(effectivePrice(item)) }}
                </strong>
              </div>

              <!-- Current price -->
              <div class="col-end t-sm" :class="isTrial && 'trial-blur'">
                <span v-if="item.current_price" class="dpc-num">{{ fmt(item.current_price) }}</span>
                <span v-else class="text-faint">—</span>
              </div>

              <!-- Variance -->
              <div class="col-center" :class="isTrial && 'trial-blur'">
                <span class="var-chip" :class="varianceDisplay(item).cls">
                  {{ varianceDisplay(item).label }}
                </span>
              </div>

              <!-- Save row button -->
              <div class="col-center">
                <button
                  v-if="localMargins[item.id] != null"
                  class="save-row-btn"
                  :disabled="savingRow === item.id"
                  @click="saveRowMargin(item)"
                  :title="isAr ? 'حفظ' : 'Save'"
                >
                  <DpcIcon :name="savingRow === item.id ? 'Loader' : 'Save'" :size="13" :stroke-width="1.7" />
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Variance legend -->
      <div class="variance-legend">
        <div class="legend-item">
          <span class="var-chip var-under">↑ Underpriced</span>
          <p>{{ isAr ? 'سعرك الحالي أقل من التكلفة المحسوبة — ارفع السعر.' : 'Your current price is below the calculated price — consider raising it.' }}</p>
        </div>
        <div class="legend-item">
          <span class="var-chip var-ok">✓ Optimal</span>
          <p>{{ isAr ? 'سعرك ضمن 5% من السعر المحسوب.' : 'Your price is within 5% of the calculated price.' }}</p>
        </div>
        <div class="legend-item">
          <span class="var-chip var-over">Buffer</span>
          <p>{{ isAr ? 'سعرك أعلى من المحسوب — لديك هامش إضافي.' : 'Your price exceeds the calculated price — you have extra buffer.' }}</p>
        </div>
      </div>
    </div>

    <!-- Sticky save bar — shown when there are unsaved local changes -->
    <div v-if="!isLockout && hasUnsaved" class="save-bar">
      <div class="save-bar-text">
        <DpcIcon name="AlertCircle" :size="15" :stroke-width="1.6" />
        {{ isAr ? 'لديك تعديلات غير محفوظة.' : 'You have unsaved margin changes.' }}
      </div>
      <button class="dpc-btn" style="background:rgba(255,255,255,.15);color:#fff;height:40px;" @click="localMargins = {}">
        {{ isAr ? 'تجاهل التعديلات' : 'Discard changes' }}
      </button>
    </div>
  </AppShell>
</template>

<style scoped>
.pl-topbar {
  position: sticky; top: 0; z-index: 5;
  padding: 20px 28px; display: flex; align-items: center; justify-content: space-between;
  background: var(--paper); border-bottom: 1px solid var(--line);
}
.pl-topbar-actions { display: flex; gap: 8px; align-items: center; }
.eyebrow-teal { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal-700); margin-bottom: 4px; }
.pl-title { font-size: 24px; }
.pl-body  { padding: 20px 28px 100px; }

/* Trial */
.trial-blur  { filter: blur(5px); user-select: none; pointer-events: none; }
.trial-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: var(--r);
  background: var(--warning-50); color: var(--warning-700);
  font-size: 13px; font-weight: 500; margin-bottom: 16px;
  box-shadow: inset 0 0 0 1px var(--warning-200);
}

/* Profit simulator */
.simulator-bar {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border-radius: var(--r);
  background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  margin-bottom: 20px;
}
.sim-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-700); white-space: nowrap; flex: none; }
.sim-pct   { font-size: 15px; font-weight: 700; color: var(--teal-700); margin-inline-start: 4px; }
.sim-slider { flex: 1; accent-color: var(--teal-600); height: 4px; cursor: pointer; }

/* Table */
.table-outer  { overflow: hidden; }
.table-scroll { overflow-x: auto; }

/* 10-column grid: name | base_cost | dr_fee | fee_type | lab | profit% | calc_price | current | variance | save */
.col-group-head,
.col-sub-head,
.data-row {
  display: grid;
  grid-template-columns: minmax(180px,2fr) 90px 90px 90px 90px 170px 100px 100px 120px 44px;
  align-items: center;
  padding: 0 18px;
  min-width: 1100px;
}

/* Group header row — spans visually */
.col-group-head {
  background: var(--paper-2); border-bottom: 1px solid var(--line-2, #eee);
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-400);
  padding-block: 8px;
}
.col-g-service { grid-column: 1; }
.col-g-cost    { grid-column: 2 / 6; text-align: center; border-inline: 1px solid var(--line-2, #eee); padding-block: 4px; }
.col-g-profit  { grid-column: 6; text-align: center; }
.col-g-price   { grid-column: 7 / 9; text-align: center; border-inline: 1px solid var(--line-2, #eee); }
.col-g-var     { grid-column: 9; text-align: center; }
.col-g-act     { grid-column: 10; }

/* Sub-header */
.col-sub-head {
  background: var(--paper-2); border-bottom: 1px solid var(--line);
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-500);
  padding-block: 10px;
}

.col-center { text-align: center; }
.col-end    { text-align: end; }

/* Category header row */
.cat-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; min-width: 1100px;
  background: var(--paper-2); border-bottom: 1px solid var(--line-2, #eee);
  font-size: 11.5px; font-weight: 600; color: var(--ink-600);
}
.cat-count { color: var(--ink-400); font-weight: 400; }

/* Data rows */
.data-row { border-bottom: 1px solid var(--line-2, #f0eeea); padding-block: 12px; }
.data-row:last-child { border-bottom: none; }
.row-under   { background: rgba(245,158,11,.04); }
.row-changed { background: rgba(20,184,166,.03); }

.t-sm       { font-size: 12.5px; color: var(--ink-700); }
.text-faint { color: var(--ink-400); }

.svc-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.svc-icon { width: 28px; height: 28px; border-radius: 7px; flex: none; background: var(--paper-2); color: var(--ink-600); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--line); }
.svc-name { font-size: 13px; font-weight: 500; color: var(--ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.svc-cat  { font-size: 11px; color: var(--ink-500); }

/* Doctor fee type badge */
.fee-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.fee-hourly { background: var(--paper-2);           color: var(--ink-600); }
.fee-fixed  { background: var(--teal-50);            color: var(--teal-700); }
.fee-pct    { background: rgba(124,58,237,.08);      color: #7C3AED; }

/* Margin control */
.margin-ctrl { display: flex; align-items: center; gap: 4px; justify-content: center; }
.mq-btn {
  width: 26px; height: 26px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: var(--paper-2); color: var(--ink-700);
  box-shadow: inset 0 0 0 1px var(--line); cursor: pointer;
  display: grid; place-items: center;
}
.mq-btn:hover { background: var(--teal-50); color: var(--teal-700); }
.mq-input {
  width: 48px; height: 26px; padding: 0 4px; text-align: center; direction: ltr;
  border-radius: 6px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 12px; font-family: var(--font-mono); font-weight: 600; border: none; outline: none;
}
.mq-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }
.mq-pct { font-size: 11px; color: var(--ink-500); }

/* Calculated price */
.price-val     { font-size: 13.5px; font-weight: 600; color: var(--ink-900); }
.price-changed { color: var(--teal-700); }

/* Save row button */
.save-row-btn {
  width: 30px; height: 30px; border-radius: 7px;
  background: var(--teal-600); color: #fff;
  display: grid; place-items: center; cursor: pointer;
}
.save-row-btn:hover:not(:disabled) { background: var(--teal-700); }
.save-row-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Variance chip */
.var-chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
.var-unset { background: var(--paper-2);     color: var(--ink-400); }
.var-ok    { background: var(--teal-50);     color: var(--teal-700); }
.var-under { background: var(--warning-50);  color: var(--warning-700); }
.var-over  { background: rgba(59,130,246,.08); color: #1d4ed8; }

/* Variance legend */
.variance-legend {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  margin-top: 20px;
  padding: 20px; border-radius: var(--r);
  background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
}
.legend-item { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.legend-item p { font-size: 12.5px; color: var(--ink-500); margin: 0; }

/* Sticky save bar */
.save-bar {
  position: sticky; bottom: 0;
  padding: 14px 28px; background: var(--ink-900); color: #fff;
  display: flex; align-items: center; justify-content: space-between; gap: 16px; z-index: 10;
}
.save-bar-text { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: rgba(255,255,255,.85); }

/* Empty state */
.empty-state { padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; color: var(--ink-400); }
.empty-icon  { color: var(--ink-300); }
.empty-state p { font-size: 14px; margin: 0; }

/* Lockout wall */
.lockout-wall { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 400px; text-align: center; padding: 40px; }
.lockout-icon  { width: 72px; height: 72px; border-radius: 18px; background: var(--paper-2); color: var(--ink-400); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--line); }
.lockout-title { font-size: 22px; font-weight: 700; color: var(--ink-900); margin: 0; }
.lockout-body  { font-size: 14px; color: var(--ink-500); max-width: 360px; margin: 0; }
</style>
