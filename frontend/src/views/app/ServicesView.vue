<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell       from '@/components/AppShell.vue'
import DpcIcon        from '@/components/DpcIcon.vue'
import DpcCoverageBar from '@/components/DpcCoverageBar.vue'
import LangSwitch     from '@/components/LangSwitch.vue'
import { usePricingStore } from '@/stores/pricing.js'
import { useClinicStore }  from '@/stores/clinic.js'
import { useI18nStore }    from '@/stores/i18n.js'
import { useRestriction }  from '@/composables/useRestriction.js'
import { useRouter }       from 'vue-router'
import axios from 'axios'

const router       = useRouter()
const pricingStore = usePricingStore()
const clinicStore  = useClinicStore()
const i18n         = useI18nStore()
const { isTrial, isLockout } = useRestriction()

const isAr            = computed(() => i18n.locale === 'ar')
const searchQ         = ref('')
const showModal       = ref(false)
const editingId       = ref(null)
const confirmDeleteId = ref(null)
const viewingRow      = ref(null)
const saving          = ref(false)

// ── Essential form fields ─────────────────────────────────────
const form = ref({
  name: '', name_ar: '', category_id: '',
  chair_time_hours: 1,
  doctor_fee_type: 'hourly',
  doctor_hourly_fee: 0, doctor_fixed_fee: 0, doctor_percentage: 0,
  current_price: '',
})

// ── Collapsible section state ─────────────────────────────────
const openConsumables  = ref(false)
const openMaterials    = ref(false)
const openEquipment    = ref(false)
const openCustomProfit = ref(false)

// ── Per-service items ─────────────────────────────────────────
const serviceConsumables = ref([])  // [{consumable_id, quantity, custom_unit_price}]
const serviceMaterials   = ref([])  // [{material_id, quantity, custom_unit_price}]
const serviceEquipment   = ref([])  // [{equipment_id, hours_used}]

// ── Custom profit ─────────────────────────────────────────────
const useDefaultProfit = ref(true)
const customProfitPct  = ref('')

// ── Derived ───────────────────────────────────────────────────
const categories     = computed(() => clinicStore.categories || [])
const allConsumables = computed(() => clinicStore.consumables || [])
const allMaterials   = computed(() => clinicStore.materials   || [])
const perHourEquip   = computed(() => (clinicStore.equipment || []).filter(e => e.allocation_type === 'per-hour'))

const calcPriceMap = computed(() => {
  const map = {}
  ;(pricingStore.priceList || []).forEach(p => { if (p.id) map[p.id] = p.calculated_price })
  return map
})

// ── Helpers ───────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }
function fmtCost(n) { return (Number(n) || 0).toFixed(2) }

function svcName(s) {
  return isAr.value ? (s.name_ar || s.name || '') : (s.name || s.name_ar || '')
}

function doctorFeeDisplay(s) {
  const type = s.doctor_fee_type || 'hourly'
  if (type === 'hourly')     return `${fmt(s.doctor_hourly_fee || 0)} ${isAr.value ? '/سا' : '/hr'}`
  if (type === 'fixed')      return `${fmt(s.doctor_fixed_fee || 0)} (${isAr.value ? 'ثابت' : 'fixed'})`
  if (type === 'percentage') return `${s.doctor_percentage || 0}%`
  return '—'
}

function pricingStatus(s) {
  const calc   = calcPriceMap.value[s.id]
  const market = s.current_price || 0
  if (!calc || calc <= 0) return 'unset'
  if (!market)            return 'unset'
  if (market < calc * 0.95) return 'low'
  return 'good'
}

function consumableUnitCost(id) {
  const c = allConsumables.value.find(x => x.id == id)
  if (!c) return 0
  return (c.pack_cost || 0) / ((c.cases_per_pack || 1) * (c.units_per_case || 1))
}

function consumableRowCost(row) {
  const qty   = parseFloat(row.quantity) || 0
  const price = row.custom_unit_price !== '' && row.custom_unit_price != null
    ? parseFloat(row.custom_unit_price)
    : consumableUnitCost(row.consumable_id)
  return qty * price
}

function materialRowCost(row) {
  return (parseFloat(row.quantity) || 0) * (parseFloat(row.custom_unit_price) || 0)
}

// ── Coverage bar data ─────────────────────────────────────────
const activeFilter = ref(null) // null | 'underpriced' | 'missing_consumables'

const pricedServicesCount = computed(() =>
  pricingStore.services.filter(s => s.current_price && s.current_price > 0).length
)

const underpricedServicesCount = computed(() =>
  pricingStore.services.filter(s => pricingStatus(s) === 'low').length
)

// Services with no consumables (no consumables configured at all)
// We use a simple heuristic: services where consumables_count from API is 0
const missingConsumablesCount = computed(() =>
  pricingStore.services.filter(s => {
    const hasConsumables = (s.consumables_count || 0) > 0 || (s.materials_count || 0) > 0
    return !hasConsumables
  }).length
)

function handleCoverageFilter({ type }) {
  activeFilter.value = type
}

// ── Table rows ────────────────────────────────────────────────
const rows = computed(() => {
  const q    = searchQ.value.toLowerCase()
  let list   = pricingStore.services.filter(s => !q || svcName(s).toLowerCase().includes(q))

  if (activeFilter.value === 'underpriced') {
    list = list.filter(s => pricingStatus(s) === 'low')
  } else if (activeFilter.value === 'missing_consumables') {
    list = list.filter(s => {
      return (s.consumables_count || 0) === 0 && (s.materials_count || 0) === 0
    })
  }

  return list
})

// ── Consumable management ─────────────────────────────────────
function addConsumableRow() {
  serviceConsumables.value.push({ consumable_id: '', quantity: 1, custom_unit_price: '' })
  openConsumables.value = true
}
function removeConsumableRow(idx) { serviceConsumables.value.splice(idx, 1) }
function onConsumableSelect(row) {
  if (!row.consumable_id) return
  if (row.custom_unit_price === '') {
    row.custom_unit_price = consumableUnitCost(row.consumable_id).toFixed(3)
  }
}

// ── Material management ───────────────────────────────────────
function addMaterialRow() {
  serviceMaterials.value.push({ material_id: '', quantity: 1, custom_unit_price: '' })
  openMaterials.value = true
}
function removeMaterialRow(idx) { serviceMaterials.value.splice(idx, 1) }
function onMaterialSelect(row) {
  if (!row.material_id) return
  const m = allMaterials.value.find(x => x.id == row.material_id)
  if (m && row.custom_unit_price === '') {
    row.custom_unit_price = (m.unit_cost || 0).toFixed(3)
  }
}

// ── Equipment management ──────────────────────────────────────
function addEquipmentRow() {
  serviceEquipment.value.push({ equipment_id: '', hours_used: 0.25 })
  openEquipment.value = true
}
function removeEquipmentRow(idx) { serviceEquipment.value.splice(idx, 1) }

// ── Modal open/close ──────────────────────────────────────────
function resetSections() {
  serviceConsumables.value = []
  serviceMaterials.value   = []
  serviceEquipment.value   = []
  openConsumables.value    = false
  openMaterials.value      = false
  openEquipment.value      = false
  openCustomProfit.value   = false
  useDefaultProfit.value   = true
  customProfitPct.value    = ''
}

function openAdd() {
  editingId.value = null
  form.value = {
    name: '', name_ar: '', category_id: '', chair_time_hours: 1,
    doctor_fee_type: 'hourly', doctor_hourly_fee: 0, doctor_fixed_fee: 0, doctor_percentage: 0,
    current_price: '',
  }
  resetSections()
  // Start all sections open so user sees them without having to expand
  openConsumables.value  = true
  openMaterials.value    = true
  openEquipment.value    = true
  openCustomProfit.value = true
  showModal.value = true
}

async function openEdit(s) {
  editingId.value = s.id
  form.value = {
    name:              s.name || '',
    name_ar:           s.name_ar || '',
    category_id:       s.category_id || '',
    chair_time_hours:  s.chair_time_hours || 1,
    doctor_fee_type:   s.doctor_fee_type || 'hourly',
    doctor_hourly_fee: s.doctor_hourly_fee || 0,
    doctor_fixed_fee:  s.doctor_fixed_fee || 0,
    doctor_percentage: s.doctor_percentage || 0,
    current_price:     s.current_price ?? '',
  }
  resetSections()
  showModal.value = true

  // Fetch full service details (consumables / materials / equipment / custom profit)
  try {
    const { data } = await axios.get(`/api/services/${s.id}`, { withCredentials: true })
    if (data.consumables?.length) {
      serviceConsumables.value = data.consumables.map(sc => ({
        consumable_id:     sc.consumable_id,
        quantity:          sc.quantity,
        custom_unit_price: sc.custom_unit_price != null
          ? sc.custom_unit_price
          : consumableUnitCost(sc.consumable_id).toFixed(3),
      }))
      openConsumables.value = true
    }
    if (data.materials?.length) {
      serviceMaterials.value = data.materials.map(sm => ({
        material_id:       sm.material_id,
        quantity:          sm.quantity,
        custom_unit_price: sm.custom_unit_price != null ? sm.custom_unit_price : (() => {
          const m = allMaterials.value.find(x => x.id == sm.material_id)
          return m ? (m.unit_cost || 0).toFixed(3) : ''
        })(),
      }))
      openMaterials.value = true
    }
    if (data.equipment_list?.length) {
      serviceEquipment.value = data.equipment_list.map(eq => ({
        equipment_id: eq.equipment_id,
        hours_used:   eq.hours_used,
      }))
      openEquipment.value = true
    } else if (data.equipment_id && data.equipment_hours_used) {
      serviceEquipment.value = [{ equipment_id: data.equipment_id, hours_used: data.equipment_hours_used }]
      openEquipment.value = true
    }
    if (data.use_default_profit === 0 || data.use_default_profit === false) {
      useDefaultProfit.value = false
      customProfitPct.value  = data.custom_profit_percent ?? ''
      openCustomProfit.value = true
    }
  } catch { /* ignore, basic fields already set */ }
}

async function saveService() {
  if (!form.value.name) return
  saving.value = true
  const payload = {
    ...form.value,
    chair_time_hours:  parseFloat(form.value.chair_time_hours) || 0,
    doctor_hourly_fee: parseFloat(form.value.doctor_hourly_fee) || 0,
    doctor_fixed_fee:  parseFloat(form.value.doctor_fixed_fee) || 0,
    doctor_percentage: parseFloat(form.value.doctor_percentage) || 0,
    current_price:     form.value.current_price !== '' ? parseFloat(form.value.current_price) || null : null,
    category_id:       form.value.category_id || null,
    consumables: serviceConsumables.value
      .filter(r => r.consumable_id && r.quantity)
      .map(r => {
        const obj = { consumable_id: parseInt(r.consumable_id), quantity: parseFloat(r.quantity) }
        if (r.custom_unit_price !== '') obj.custom_unit_price = parseFloat(r.custom_unit_price)
        return obj
      }),
    materials: serviceMaterials.value
      .filter(r => r.material_id && r.quantity)
      .map(r => {
        const obj = { material_id: parseInt(r.material_id), quantity: parseFloat(r.quantity) }
        if (r.custom_unit_price !== '') obj.custom_unit_price = parseFloat(r.custom_unit_price)
        return obj
      }),
    equipment_list: serviceEquipment.value
      .filter(r => r.equipment_id && r.hours_used)
      .map(r => ({ equipment_id: parseInt(r.equipment_id), hours_used: parseFloat(r.hours_used) })),
    use_default_profit:    useDefaultProfit.value ? 1 : 0,
    custom_profit_percent: !useDefaultProfit.value && customProfitPct.value !== ''
      ? parseFloat(customProfitPct.value) : null,
  }
  try {
    if (editingId.value) {
      await pricingStore.updateService(editingId.value, payload)
    } else {
      await pricingStore.createService(payload)
    }
    await pricingStore.loadPriceList().catch(() => {})
    showModal.value = false
  } catch (e) { console.error(e) }
  finally { saving.value = false }
}

async function deleteService(id) {
  await pricingStore.deleteService(id)
  confirmDeleteId.value = null
}

onMounted(async () => {
  await Promise.all([
    pricingStore.loadSetupStatus().catch(() => {}),
    pricingStore.loadServices(),
    pricingStore.loadPriceList().catch(() => {}),
    clinicStore.loadAll().catch(() => {}),
  ])
})
</script>

<template>
  <AppShell active-key="services">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="dpc-h page-title">{{ isAr ? 'الخدمات' : 'Services' }}</h1>
        <p class="page-sub">{{ isAr ? 'كل إجراء بوقت الكرسي والخامات وأتعاب الطبيب.' : 'Every procedure with its chair time, materials, and doctor fee.' }}</p>
      </div>
      <div class="header-actions">
        <div class="search-wrap">
          <DpcIcon name="Search" :size="15" :stroke-width="1.6" class="search-icon" />
          <input v-model="searchQ" :placeholder="isAr ? 'ابحث...' : 'Search...'" class="search-input" />
        </div>
        <button class="dpc-btn dpc-btn-teal btn-sm" @click="openAdd">
          <DpcIcon name="Plus" :size="13" :stroke-width="2" />
          {{ isAr ? 'خدمة جديدة' : 'New service' }}
        </button>
        <LangSwitch />
      </div>
    </div>

    <!-- Lockout wall -->
    <div v-if="isLockout" class="lockout-wall">
      <div class="lockout-icon"><DpcIcon name="Shield" :size="32" :stroke-width="1.4" /></div>
      <h3 class="lockout-title">{{ isAr ? 'انتهت التجربة المجانية' : 'Trial ended' }}</h3>
      <p class="lockout-body">{{ isAr ? 'قم بالترقية للوصول إلى الخدمات.' : 'Upgrade your subscription to access services.' }}</p>
      <button class="dpc-btn dpc-btn-teal" @click="router.push('/app/subscription')">{{ isAr ? 'عرض الخطط' : 'View plans' }}</button>
    </div>

    <div v-else class="svc-body">
      <!-- Coverage bar -->
      <DpcCoverageBar
        class="coverage-bar-section"
        :total-services="pricingStore.services.length"
        :priced-services="pricedServicesCount"
        :underpriced-services="underpricedServicesCount"
        :missing-consumables="missingConsumablesCount"
        @filter="handleCoverageFilter"
      />

      <!-- Trial banner -->
      <div v-if="isTrial" class="trial-banner">
        <DpcIcon name="Info" :size="15" :stroke-width="1.6" />
        {{ isAr ? 'وضع التجربة — التكاليف مخفية.' : 'Trial mode — cost figures are blurred.' }}
      </div>

      <!-- Services table -->
      <div class="dpc-panel table-wrap">
        <div class="table-head">
          <div>{{ isAr ? 'اسم الخدمة' : 'Service name' }}</div>
          <div class="col-center">{{ isAr ? 'وقت الكرسي' : 'Chair time' }}</div>
          <div>{{ isAr ? 'أتعاب الطبيب' : 'Doctor fee' }}</div>
          <div>{{ isAr ? 'المعدة' : 'Equipment' }}</div>
          <div class="col-center">{{ isAr ? 'حالة التسعير' : 'Pricing status' }}</div>
          <div></div>
        </div>

        <div v-if="rows.length === 0" class="empty-state">
          <DpcIcon name="Stethoscope" :size="32" :stroke-width="1.3" class="empty-icon" />
          <p>{{ searchQ ? (isAr ? 'لا توجد نتائج' : 'No services match') : (isAr ? 'لم تُضف أي خدمة بعد' : 'No services added yet') }}</p>
          <button v-if="!searchQ" class="dpc-btn dpc-btn-teal" style="height:36px;" @click="openAdd">
            <DpcIcon name="Plus" :size="13" :stroke-width="2" />
            {{ isAr ? 'أضف خدمة' : 'Add service' }}
          </button>
        </div>

        <div v-for="(row, i) in rows" :key="row.id" :class="['table-row', i < rows.length - 1 && 'row-border']">
          <div class="svc-cell">
            <div class="svc-icon"><DpcIcon name="Stethoscope" :size="14" :stroke-width="1.7" /></div>
            <div>
              <div class="svc-name">{{ svcName(row) }}</div>
              <div v-if="row.category_name" class="svc-cat">{{ row.category_name }}</div>
            </div>
          </div>
          <div class="col-center"><span class="dpc-num t-sm">{{ row.chair_time_hours }}<span class="t-unit">{{ isAr ? 'سا' : 'hr' }}</span></span></div>
          <div class="t-sm">{{ doctorFeeDisplay(row) }}</div>
          <div class="t-sm text-faint">{{ row.equipment_name || '—' }}</div>
          <div class="col-center">
            <span v-if="pricingStatus(row) === 'good'" class="status-chip chip-good">✓ {{ isAr ? 'جيد' : 'Good' }}</span>
            <span v-else-if="pricingStatus(row) === 'low'" class="status-chip chip-low">⚠ {{ isAr ? 'منخفض' : 'Low' }}</span>
            <span v-else class="status-chip chip-unset">{{ isAr ? 'غير محدد' : 'Unset' }}</span>
          </div>
          <div class="actions-cell">
            <button class="icon-btn view-btn" :title="isAr ? 'تفاصيل السعر' : 'Price details'" @click="viewingRow = row"><DpcIcon name="Eye" :size="14" :stroke-width="1.7" /></button>
            <button class="icon-btn edit-btn" :title="isAr ? 'تعديل' : 'Edit'" @click="openEdit(row)"><DpcIcon name="Pencil" :size="14" :stroke-width="1.7" /></button>
            <button class="icon-btn del-btn" @click="confirmDeleteId = row.id"><DpcIcon name="Trash2" :size="14" :stroke-width="1.7" /></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Add / Edit modal ──────────────────────────────────── -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="dpc-h modal-title">{{ editingId ? (isAr ? 'تعديل خدمة' : 'Edit service') : (isAr ? 'إضافة خدمة' : 'Add service') }}</h2>
          <button class="icon-btn" @click="showModal = false"><DpcIcon name="X" :size="16" :stroke-width="2" /></button>
        </div>

        <div class="modal-body">

          <!-- Name + Category -->
          <div class="form-row">
            <div class="form-group fg-2">
              <label class="field-label">{{ isAr ? 'اسم الخدمة *' : 'Service name *' }}</label>
              <input v-model="form.name" class="modal-input" :placeholder="isAr ? 'مثال: حشو ضرسي' : 'e.g., Dental Filling'" />
            </div>
            <div class="form-group fg-1">
              <label class="field-label">{{ isAr ? 'الفئة' : 'Category' }}</label>
              <select v-model="form.category_id" class="modal-input">
                <option value="">{{ isAr ? 'بدون فئة' : 'No category' }}</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <!-- Arabic name -->
          <div class="form-group">
            <label class="field-label">{{ isAr ? 'الاسم بالعربية' : 'Name (Arabic)' }}</label>
            <input v-model="form.name_ar" class="modal-input" dir="rtl" :placeholder="isAr ? 'اسم الخدمة بالعربية' : 'Arabic name (optional)'" />
          </div>

          <!-- Chair time -->
          <div class="form-group">
            <label class="field-label">{{ isAr ? 'وقت الكرسي (ساعة) *' : 'Chair time (hours) *' }}</label>
            <div class="input-row">
              <input v-model.number="form.chair_time_hours" type="number" step="0.25" min="0.25" class="modal-input" style="flex:1;min-width:0" />
              <button type="button" class="quick-btn" @click="form.chair_time_hours = 0.25">15m</button>
              <button type="button" class="quick-btn" @click="form.chair_time_hours = 0.5">30m</button>
              <button type="button" class="quick-btn" @click="form.chair_time_hours = 1">1hr</button>
              <button type="button" class="quick-btn" @click="form.chair_time_hours = 1.5">1.5hr</button>
              <button type="button" class="quick-btn" @click="form.chair_time_hours = 2">2hr</button>
            </div>
          </div>

          <!-- Doctor fee type + amount -->
          <div class="form-row">
            <div class="form-group fg-1">
              <label class="field-label">{{ isAr ? 'نوع أتعاب الطبيب' : 'Doctor fee type' }}</label>
              <select v-model="form.doctor_fee_type" class="modal-input">
                <option value="hourly">{{ isAr ? 'بالساعة' : 'Hourly rate' }}</option>
                <option value="fixed">{{ isAr ? 'مبلغ ثابت' : 'Fixed fee' }}</option>
                <option value="percentage">{{ isAr ? 'نسبة مئوية' : 'Percentage' }}</option>
              </select>
            </div>
            <div class="form-group fg-1">
              <template v-if="form.doctor_fee_type === 'hourly'">
                <label class="field-label">{{ isAr ? 'سعر الساعة' : 'Fee per hour' }}</label>
                <input v-model.number="form.doctor_hourly_fee" type="number" class="modal-input" placeholder="e.g., 500" />
              </template>
              <template v-else-if="form.doctor_fee_type === 'fixed'">
                <label class="field-label">{{ isAr ? 'مبلغ ثابت' : 'Fixed amount' }}</label>
                <input v-model.number="form.doctor_fixed_fee" type="number" class="modal-input" placeholder="e.g., 1000" />
              </template>
              <template v-else>
                <label class="field-label">{{ isAr ? 'النسبة %' : 'Percentage %' }}</label>
                <input v-model.number="form.doctor_percentage" type="number" step="0.5" min="0" max="100" class="modal-input" placeholder="e.g., 30" />
              </template>
            </div>
          </div>

          <!-- Current market price -->
          <div class="form-group">
            <label class="field-label">{{ isAr ? 'سعرك الحالي (اختياري)' : 'Current market price (optional)' }}</label>
            <input v-model="form.current_price" type="number" class="modal-input" :placeholder="isAr ? 'ما تتقاضاه حالياً' : 'What you currently charge'" />
            <p class="field-hint">{{ isAr ? 'يُستخدم لمقارنة سعرك بالسعر المحسوب.' : 'Used to compare your price against the calculated price.' }}</p>
          </div>

          <!-- ── Collapsible: Consumables ────────────────────── -->
          <div class="coll-section">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openConsumables = !openConsumables">
                <span class="coll-chevron" :class="{ open: openConsumables }"><DpcIcon name="ChevronRight" :size="13" :stroke-width="2.2" /></span>
                <span class="coll-title">{{ isAr ? 'المستهلكات' : 'Consumables' }}</span>
                <span v-if="serviceConsumables.length" class="coll-count">{{ serviceConsumables.length }}</span>
              </button>
              <button type="button" class="coll-add-btn" @click="addConsumableRow()">
                <DpcIcon name="Plus" :size="12" :stroke-width="2.5" />
                {{ isAr ? 'إضافة' : 'Add' }}
              </button>
            </div>
            <div v-show="openConsumables" class="coll-body">
              <div v-if="serviceConsumables.length" class="items-hdr">
                <span>{{ isAr ? 'المستهلك' : 'Consumable' }}</span>
                <span>{{ isAr ? 'كمية' : 'Qty' }}</span>
                <span>{{ isAr ? 'سعر/وحدة' : 'Unit price' }}</span>
                <span>{{ isAr ? 'تكلفة' : 'Cost' }}</span>
                <span></span>
              </div>
              <div v-for="(row, idx) in serviceConsumables" :key="idx" class="item-row cons-row">
                <select v-model="row.consumable_id" class="item-input" @change="onConsumableSelect(row)">
                  <option value="">{{ isAr ? 'اختر مستهلكاً...' : 'Select consumable...' }}</option>
                  <option v-for="c in allConsumables" :key="c.id" :value="c.id">
                    {{ isAr ? (c.name_ar || c.item_name) : c.item_name }}
                  </option>
                </select>
                <input v-model.number="row.quantity" type="number" step="0.01" min="0.01" class="item-input" :placeholder="isAr ? 'كمية' : 'Qty'" />
                <input v-model="row.custom_unit_price" type="number" step="0.001" min="0" class="item-input" :placeholder="isAr ? 'سعر/وحدة' : 'Unit price'" />
                <span class="item-cost">{{ fmtCost(consumableRowCost(row)) }}</span>
                <button type="button" class="item-del" @click="removeConsumableRow(idx)"><DpcIcon name="X" :size="12" :stroke-width="2.5" /></button>
              </div>
              <p v-if="!serviceConsumables.length" class="coll-empty">{{ isAr ? 'اضغط «إضافة» لإضافة مستهلكات.' : 'Click «Add» to add consumables.' }}</p>
            </div>
          </div>

          <!-- ── Collapsible: Lab Materials ─────────────────── -->
          <div class="coll-section">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openMaterials = !openMaterials">
                <span class="coll-chevron" :class="{ open: openMaterials }"><DpcIcon name="ChevronRight" :size="13" :stroke-width="2.2" /></span>
                <span class="coll-title">{{ isAr ? 'مواد المختبر' : 'Lab Materials' }}</span>
                <span v-if="serviceMaterials.length" class="coll-count">{{ serviceMaterials.length }}</span>
              </button>
              <button type="button" class="coll-add-btn" @click="addMaterialRow()">
                <DpcIcon name="Plus" :size="12" :stroke-width="2.5" />
                {{ isAr ? 'إضافة' : 'Add' }}
              </button>
            </div>
            <div v-show="openMaterials" class="coll-body">
              <div v-if="serviceMaterials.length" class="items-hdr">
                <span>{{ isAr ? 'المادة' : 'Material' }}</span>
                <span>{{ isAr ? 'كمية' : 'Qty' }}</span>
                <span>{{ isAr ? 'سعر/وحدة' : 'Unit price' }}</span>
                <span>{{ isAr ? 'تكلفة' : 'Cost' }}</span>
                <span></span>
              </div>
              <div v-for="(row, idx) in serviceMaterials" :key="idx" class="item-row cons-row">
                <select v-model="row.material_id" class="item-input" @change="onMaterialSelect(row)">
                  <option value="">{{ isAr ? 'اختر مادة...' : 'Select material...' }}</option>
                  <option v-for="m in allMaterials" :key="m.id" :value="m.id">
                    {{ isAr ? (m.name_ar || m.material_name) : m.material_name }}
                  </option>
                </select>
                <input v-model.number="row.quantity" type="number" step="0.01" min="0.01" class="item-input" :placeholder="isAr ? 'كمية' : 'Qty'" />
                <input v-model="row.custom_unit_price" type="number" step="0.001" min="0" class="item-input" :placeholder="isAr ? 'سعر/وحدة' : 'Unit price'" />
                <span class="item-cost">{{ fmtCost(materialRowCost(row)) }}</span>
                <button type="button" class="item-del" @click="removeMaterialRow(idx)"><DpcIcon name="X" :size="12" :stroke-width="2.5" /></button>
              </div>
              <p v-if="!serviceMaterials.length" class="coll-empty">{{ isAr ? 'اضغط «إضافة» لإضافة مواد.' : 'Click «Add» to add materials.' }}</p>
            </div>
          </div>

          <!-- ── Collapsible: Special Equipment ────────────── -->
          <div class="coll-section">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openEquipment = !openEquipment">
                <span class="coll-chevron" :class="{ open: openEquipment }"><DpcIcon name="ChevronRight" :size="13" :stroke-width="2.2" /></span>
                <span class="coll-title">{{ isAr ? 'معدات خاصة' : 'Special Equipment' }}</span>
                <span v-if="serviceEquipment.length" class="coll-count">{{ serviceEquipment.length }}</span>
              </button>
              <button type="button" class="coll-add-btn" @click="addEquipmentRow()">
                <DpcIcon name="Plus" :size="12" :stroke-width="2.5" />
                {{ isAr ? 'إضافة' : 'Add' }}
              </button>
            </div>
            <div v-show="openEquipment" class="coll-body">
              <div v-if="serviceEquipment.length" class="items-hdr equip-hdr">
                <span>{{ isAr ? 'المعدة' : 'Equipment' }}</span>
                <span>{{ isAr ? 'وقت الاستخدام (سا)' : 'Usage time (hrs)' }}</span>
                <span></span>
              </div>
              <div v-for="(row, idx) in serviceEquipment" :key="idx" class="item-row equip-row">
                <select v-model="row.equipment_id" class="item-input">
                  <option value="">{{ isAr ? 'اختر معدة...' : 'Select equipment...' }}</option>
                  <option v-for="e in perHourEquip" :key="e.id" :value="e.id">{{ e.asset_name }}</option>
                </select>
                <input v-model.number="row.hours_used" type="number" step="0.01" min="0.01" class="item-input" placeholder="0.25" />
                <button type="button" class="item-del" @click="removeEquipmentRow(idx)"><DpcIcon name="X" :size="12" :stroke-width="2.5" /></button>
              </div>
              <p v-if="!serviceEquipment.length" class="coll-empty">{{ isAr ? 'اضغط «إضافة» لإضافة معدة.' : 'Click «Add» to add equipment.' }}</p>
            </div>
          </div>

          <!-- ── Collapsible: Custom Profit ─────────────────── -->
          <div class="coll-section">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openCustomProfit = !openCustomProfit">
                <span class="coll-chevron" :class="{ open: openCustomProfit }"><DpcIcon name="ChevronRight" :size="13" :stroke-width="2.2" /></span>
                <span class="coll-title">{{ isAr ? 'هامش ربح مخصص' : 'Custom Pricing' }}</span>
                <span class="coll-badge">
                  {{ !useDefaultProfit && customProfitPct !== '' ? customProfitPct + '%' : (isAr ? 'الافتراضي' : 'Default') }}
                </span>
              </button>
            </div>
            <div v-show="openCustomProfit" class="coll-body">
              <label class="profit-check-label">
                <input v-model="useDefaultProfit" type="checkbox" class="profit-check" />
                {{ isAr ? 'استخدام هامش الربح الافتراضي' : 'Use default profit margin' }}
              </label>
              <div v-if="!useDefaultProfit" class="form-group" style="margin-top:10px">
                <label class="field-label">{{ isAr ? 'هامش الربح المخصص' : 'Custom profit margin' }}</label>
                <div class="input-row">
                  <input v-model="customProfitPct" type="number" step="1" min="0" class="modal-input" style="flex:1;min-width:0" placeholder="e.g., 50" />
                  <span class="unit-lbl">%</span>
                </div>
                <p class="field-hint">{{ isAr ? 'يُطبَّق على هذه الخدمة فقط بدلاً من الهامش العام.' : 'Applied to this service only, overriding the global margin.' }}</p>
              </div>
            </div>
          </div>

        </div><!-- /modal-body -->

        <div class="modal-footer">
          <button class="dpc-btn dpc-btn-ghost" @click="showModal = false">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button class="dpc-btn dpc-btn-teal" :disabled="saving || !form.name" @click="saveService">
            {{ saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : editingId ? (isAr ? 'حفظ التعديلات' : 'Save changes') : (isAr ? 'إضافة الخدمة' : 'Add service') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Confirm delete ──────────────────────────────────── -->
    <div v-if="confirmDeleteId" class="modal-overlay" @click.self="confirmDeleteId = null">
      <div class="modal-box confirm-box">
        <div class="dpc-h modal-title" style="padding:20px 24px;">{{ isAr ? 'تأكيد الحذف' : 'Confirm delete' }}</div>
        <p class="confirm-text">{{ isAr ? 'هل تريد حذف هذه الخدمة؟ لا يمكن التراجع.' : 'Delete this service? This cannot be undone.' }}</p>
        <div class="modal-footer">
          <button class="dpc-btn dpc-btn-ghost" @click="confirmDeleteId = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button class="dpc-btn" style="background:var(--danger-600);color:#fff;" @click="deleteService(confirmDeleteId)">{{ isAr ? 'حذف' : 'Delete' }}</button>
        </div>
      </div>
    </div>

    <!-- ── Price detail modal ──────────────────────────────── -->
    <div v-if="viewingRow" class="modal-overlay" @click.self="viewingRow = null">
      <div class="modal-box detail-box">
        <div class="modal-header">
          <h2 class="dpc-h modal-title">{{ svcName(viewingRow) }}</h2>
          <button class="icon-btn" @click="viewingRow = null"><DpcIcon name="X" :size="16" :stroke-width="2" /></button>
        </div>
        <div class="detail-body">
          <div class="detail-row"><span>{{ isAr ? 'وقت الكرسي' : 'Chair time' }}</span><span class="dpc-num">{{ viewingRow.chair_time_hours }}{{ isAr ? ' سا' : ' hr' }}</span></div>
          <div class="detail-row"><span>{{ isAr ? 'نوع أتعاب الطبيب' : 'Doctor fee type' }}</span><span>{{ doctorFeeDisplay(viewingRow) }}</span></div>
          <div class="detail-row"><span>{{ isAr ? 'المعدة' : 'Equipment' }}</span><span>{{ viewingRow.equipment_name || '—' }}</span></div>
          <div class="detail-row"><span>{{ isAr ? 'الفئة' : 'Category' }}</span><span>{{ viewingRow.category_name || '—' }}</span></div>
          <div v-if="viewingRow.current_price" class="detail-row detail-row-price">
            <span>{{ isAr ? 'سعرك الحالي' : 'Current price' }}</span>
            <span class="dpc-num">{{ fmt(viewingRow.current_price) }}</span>
          </div>
          <div v-if="calcPriceMap[viewingRow.id]" class="detail-row detail-row-total">
            <span>{{ isAr ? 'السعر المحسوب' : 'Calculated price' }}</span>
            <span class="dpc-num">{{ fmt(calcPriceMap[viewingRow.id]) }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="dpc-btn dpc-btn-ghost" @click="viewingRow = null">{{ isAr ? 'إغلاق' : 'Close' }}</button>
          <button class="dpc-btn dpc-btn-teal" @click="openEdit(viewingRow); viewingRow = null">
            <DpcIcon name="Pencil" :size="13" :stroke-width="1.7" />
            {{ isAr ? 'تعديل' : 'Edit' }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
/* ── Page layout ──────────────────────────────────────────── */
.page-header {
  padding: 22px 28px;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  background: var(--paper); border-bottom: 1px solid var(--line);
}
.page-title { font-size: 24px; margin-bottom: 4px; }
.page-sub   { color: var(--ink-500); font-size: 13.5px; margin: 0; max-width: 720px; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.btn-sm { height: 36px; }
.search-wrap { position: relative; }
.search-icon { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-400); pointer-events: none; }
.search-input { height: 36px; padding: 0 14px 0 36px; width: 240px; border-radius: 10px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); font-size: 13px; outline: none; border: none; }

/* ── Services body ────────────────────────────────────────── */
.svc-body { padding: 20px 28px 28px; }
.coverage-bar-section { margin-bottom: 16px; }

/* ── Table ────────────────────────────────────────────────── */
.table-wrap { overflow: hidden; }
.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(0,2fr) 110px minmax(0,1.2fr) minmax(0,1.2fr) 130px 90px;
  align-items: center;
  padding: 12px 18px;
}
.table-head { background: var(--paper-2); border-bottom: 1px solid var(--line); font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-500); }
.row-border { border-bottom: 1px solid var(--line-2, #f0eeea); }
.col-center { text-align: center; }

.svc-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
.svc-icon { width: 30px; height: 30px; border-radius: 8px; flex: none; background: var(--paper-2); color: var(--ink-600); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--line); }
.svc-name { font-size: 13.5px; font-weight: 500; color: var(--ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.svc-cat  { font-size: 11px; color: var(--ink-500); }

.t-sm       { font-size: 13px; color: var(--ink-700); }
.t-unit     { font-size: 10px; color: var(--ink-500); margin-inline-start: 2px; }
.text-faint { color: var(--ink-500); }

.status-chip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; }
.chip-good  { background: var(--teal-50);    color: var(--teal-700); }
.chip-low   { background: var(--warning-50); color: var(--warning-700); }
.chip-unset { background: var(--paper-2);    color: var(--ink-500); }

.actions-cell { display: flex; justify-content: flex-end; gap: 2px; }
.icon-btn { width: 28px; height: 28px; border-radius: 7px; color: var(--ink-400); display: grid; place-items: center; cursor: pointer; }
.view-btn:hover { background: var(--teal-50);   color: var(--teal-700); }
.edit-btn:hover { background: var(--paper-2);   color: var(--ink-900); }
.del-btn:hover  { background: var(--danger-50); color: var(--danger-700); }

.empty-state { padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; color: var(--ink-400); }
.empty-icon  { color: var(--ink-300); }
.empty-state p { font-size: 14px; margin: 0; }

/* ── Modal shell ──────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; z-index: 100; }
.modal-box     { background: var(--surface); border-radius: 16px; width: 580px; box-shadow: 0 20px 60px rgba(0,0,0,.13); overflow: hidden; max-height: 92vh; display: flex; flex-direction: column; }
.confirm-box   { width: 380px; }
.detail-box    { width: 440px; }
.modal-header  { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); flex: none; }
.modal-title   { font-size: 18px; }
.modal-body    { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; min-height: 0; }
.modal-footer  { padding: 16px 24px; display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--line); flex: none; }
.confirm-text  { padding: 12px 24px; font-size: 14px; color: var(--ink-600); margin: 0; }

/* ── Form fields ──────────────────────────────────────────── */
.form-row  { display: flex; gap: 12px; flex-shrink: 0; }
.fg-1 { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.fg-2 { flex: 2; display: flex; flex-direction: column; gap: 4px; }
.form-group { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--ink-700); }
.field-hint  { font-size: 11.5px; color: var(--ink-500); margin: 2px 0 0; }

.modal-input {
  height: 38px; padding: 0 10px; width: 100%;
  border-radius: 8px; background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13.5px; border: none; outline: none; box-sizing: border-box;
}
.modal-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }

.input-row { display: flex; align-items: center; gap: 6px; }
.quick-btn {
  flex: none; height: 36px; padding: 0 10px; border-radius: 7px;
  background: var(--paper-2); color: var(--ink-700); font-size: 12px; font-weight: 500;
  box-shadow: inset 0 0 0 1px var(--line); cursor: pointer; white-space: nowrap;
}
.quick-btn:hover { background: var(--teal-50); color: var(--teal-700); }
.unit-lbl { font-size: 14px; font-weight: 600; color: var(--ink-500); white-space: nowrap; }

/* ── Collapsible sections ─────────────────────────────────── */
.coll-section { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; flex-shrink: 0; }

.coll-header {
  display: flex; align-items: center; gap: 0;
  background: var(--paper-2);
  border-bottom: 1px solid transparent;
}
.coll-section:has(.coll-body[style*="display: block"]) .coll-header,
.coll-section:has(.coll-body:not([style*="none"])) .coll-header {
  border-bottom-color: var(--line);
}

.coll-toggle {
  flex: 1; display: flex; align-items: center; gap: 8px;
  padding: 11px 14px; cursor: pointer; text-align: start;
}
.coll-toggle:hover { background: rgba(0,0,0,.03); }
.coll-chevron { color: var(--ink-400); transition: transform 0.18s; display: flex; align-items: center; }
.coll-chevron.open { transform: rotate(90deg); }
.coll-title { font-size: 13px; font-weight: 600; color: var(--ink-800); flex: 1; }
.coll-count { font-size: 11px; font-weight: 700; color: var(--teal-700); background: var(--teal-50); border-radius: 99px; padding: 1px 7px; }
.coll-badge { font-size: 11px; color: var(--ink-500); background: var(--surface); border: 1px solid var(--line); border-radius: 99px; padding: 1px 7px; }

.coll-add-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 0 14px; height: 100%; min-height: 40px;
  font-size: 12px; font-weight: 600; color: var(--teal-700);
  cursor: pointer; border-inline-start: 1px solid var(--line);
  white-space: nowrap;
}
.coll-add-btn:hover { background: var(--teal-50); }

.coll-body  { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; background: var(--surface); }
.coll-empty { font-size: 12.5px; color: var(--ink-400); text-align: center; padding: 8px; margin: 0; }

/* ── Item row grid (consumables & materials) ─────────────── */
.items-hdr,
.cons-row {
  display: grid;
  grid-template-columns: 1fr 72px 92px 68px 28px;
  gap: 6px;
  align-items: center;
}
.items-hdr {
  font-size: 10.5px; font-weight: 600; color: var(--ink-500);
  text-transform: uppercase; letter-spacing: 0.05em;
  padding-bottom: 4px; border-bottom: 1px solid var(--line-2, #f0eeea);
  margin-bottom: 2px;
}

/* ── Item row grid (equipment) ───────────────────────────── */
.equip-hdr,
.equip-row {
  display: grid;
  grid-template-columns: 1fr 140px 28px;
  gap: 6px;
  align-items: center;
}
.equip-hdr { font-size: 10.5px; font-weight: 600; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 4px; border-bottom: 1px solid var(--line-2, #f0eeea); margin-bottom: 2px; }

/* ── Item inputs ──────────────────────────────────────────── */
.item-input {
  width: 100%; height: 34px; padding: 0 8px;
  border-radius: 7px; background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px; border: none; outline: none; box-sizing: border-box;
}
.item-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }
.item-cost { font-size: 12.5px; font-weight: 500; color: var(--ink-700); text-align: end; }
.item-del  {
  width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center;
  color: var(--ink-400); cursor: pointer;
}
.item-del:hover { background: var(--danger-50); color: var(--danger-700); }

/* ── Custom profit ────────────────────────────────────────── */
.profit-check-label { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-700); cursor: pointer; }
.profit-check { width: 16px; height: 16px; flex: none; accent-color: var(--teal-600); }

/* ── Detail modal ─────────────────────────────────────────── */
.detail-body { padding: 8px 24px 16px; }
.detail-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--line-2, #f0eeea);
  font-size: 13.5px; color: var(--ink-700);
}
.detail-row:last-child { border-bottom: none; }
.detail-row-total { font-weight: 600; color: var(--ink-900); }
.detail-row-price .dpc-num { color: var(--teal-700); font-weight: 600; }

/* ── Lockout / trial ──────────────────────────────────────── */
.lockout-wall  { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 400px; text-align: center; padding: 40px; }
.lockout-icon  { width: 72px; height: 72px; border-radius: 18px; background: var(--paper-2); color: var(--ink-400); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--line); }
.lockout-title { font-size: 22px; font-weight: 700; color: var(--ink-900); margin: 0; }
.lockout-body  { font-size: 14px; color: var(--ink-500); max-width: 360px; margin: 0; }
.trial-banner  { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--r); background: var(--warning-50); color: var(--warning-700); font-size: 13px; font-weight: 500; margin-bottom: 14px; box-shadow: inset 0 0 0 1px var(--warning-200); }
</style>
