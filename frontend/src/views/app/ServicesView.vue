<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell       from '@/components/AppShell.vue'
import DpcBtn         from '@/components/DpcBtn.vue'
import DpcIcon        from '@/components/DpcIcon.vue'
import DpcCoverageBar from '@/components/DpcCoverageBar.vue'
import LangSwitch     from '@/components/LangSwitch.vue'
import DpcTable       from '@/components/table/DpcTable.vue'
import DpcTableHead   from '@/components/table/DpcTableHead.vue'
import DpcTableRow    from '@/components/table/DpcTableRow.vue'
import DpcTableCell   from '@/components/table/DpcTableCell.vue'
import PageHeader     from '@/components/PageHeader.vue'
import AlertBanner    from '@/components/AlertBanner.vue'
import { usePricingStore } from '@/stores/pricing.js'
import { useClinicStore }  from '@/stores/clinic.js'
import { useI18nStore }    from '@/stores/i18n.js'
import { useRestriction }  from '@/composables/useRestriction.js'
import { useAchievements } from '@/composables/useAchievements.js'
import { useRouter }       from 'vue-router'
import axios from 'axios'

const router       = useRouter()
const pricingStore = usePricingStore()
const clinicStore  = useClinicStore()
const i18n         = useI18nStore()
const { isTrial, isLockout } = useRestriction()
const { trackPriceFix } = useAchievements()

const isAr            = computed(() => i18n.locale === 'ar')
const searchQ         = ref('')
const showModal       = ref(false)
const editingId       = ref(null)
const confirmDeleteId = ref(null)
const viewingRow      = ref(null)
const viewingPrice    = ref(null)   // full cost breakdown from /api/services/:id/price
const loadingPrice    = ref(false)
const saving          = ref(false)
const loadingTemplate = ref(false)
const wasUnderpriced  = ref(false)  // tracks if edited service was underpriced before update

// ── Common dental services template ───────────────────────────
const COMMON_SERVICES = [
  {
    name: 'Dental Filling (Composite)',
    name_ar: 'حشو ضرسي (كومبوزيت)',
    chair_time_hours: 0.75,
    doctor_fee_type: 'hourly',
    doctor_hourly_fee: 200,
  },
  {
    name: 'Root Canal Treatment',
    name_ar: 'علاج جذور',
    chair_time_hours: 1.5,
    doctor_fee_type: 'hourly',
    doctor_hourly_fee: 300,
  },
  {
    name: 'Crown (Ceramic)',
    name_ar: 'تاج سيراميك',
    chair_time_hours: 1.0,
    doctor_fee_type: 'hourly',
    doctor_hourly_fee: 250,
  },
  {
    name: 'Teeth Cleaning & Scaling',
    name_ar: 'تنظيف وتقليح',
    chair_time_hours: 0.5,
    doctor_fee_type: 'hourly',
    doctor_hourly_fee: 150,
  },
  {
    name: 'Tooth Extraction (Simple)',
    name_ar: 'خلع ضرس بسيط',
    chair_time_hours: 0.5,
    doctor_fee_type: 'hourly',
    doctor_hourly_fee: 180,
  },
  {
    name: 'Teeth Whitening',
    name_ar: 'تبييض أسنان',
    chair_time_hours: 1.0,
    doctor_fee_type: 'hourly',
    doctor_hourly_fee: 200,
  },
  {
    name: 'Dental Implant',
    name_ar: 'زراعة سن',
    chair_time_hours: 2.0,
    doctor_fee_type: 'hourly',
    doctor_hourly_fee: 400,
  },
  {
    name: 'Orthodontic Consultation',
    name_ar: 'استشارة تقويم',
    chair_time_hours: 0.5,
    doctor_fee_type: 'fixed',
    doctor_fixed_fee: 200,
  },
  {
    name: 'X-Ray (Panoramic)',
    name_ar: 'أشعة بانورامية',
    chair_time_hours: 0.25,
    doctor_fee_type: 'fixed',
    doctor_fixed_fee: 150,
  },
  {
    name: 'Dental Checkup',
    name_ar: 'كشف عام',
    chair_time_hours: 0.25,
    doctor_fee_type: 'fixed',
    doctor_fixed_fee: 100,
  },
]

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
const serviceConsumables = ref([])  // [{consumable_id, quantity, use_master, custom_unit_price}]
const serviceMaterials   = ref([])  // [{material_id,   quantity, use_master, custom_unit_price}]
const serviceEquipment   = ref([])  // [{equipment_id, hours_used}]

// ── Custom profit ─────────────────────────────────────────────
const useDefaultProfit = ref(true)
const customProfitPct  = ref('')

// ── Global clinic settings (for live calculator) ─────────────
const globalSettings = ref(null) // {vat_percent, default_profit_percent, rounding_nearest, total_overhead_per_hour, currency}

// ── Derived ───────────────────────────────────────────────────
const categories     = computed(() => clinicStore.categories || [])
const allConsumables = computed(() => clinicStore.consumables || [])
const allMaterials   = computed(() => clinicStore.materials   || [])
const perHourEquip   = computed(() => (clinicStore.equipment || []).filter(e => e.allocation_type === 'per-hour'))

const calcPriceMap = computed(() => {
  const map = {}
  ;(pricingStore.priceList || []).forEach(p => { if (p.id) map[p.id] = p.rounded_price })
  return map
})

// ── Live price preview (recalculates as user types) ───────────
const livePrice = computed(() => {
  const gs          = globalSettings.value || {}
  const chairTime   = parseFloat(form.value.chair_time_hours) || 0
  const feeType     = form.value.doctor_fee_type || 'hourly'
  const hourlyFee   = parseFloat(form.value.doctor_hourly_fee) || 0
  const fixedFee    = parseFloat(form.value.doctor_fixed_fee) || 0
  const pctFee      = parseFloat(form.value.doctor_percentage) || 0

  if (chairTime <= 0 || (hourlyFee <= 0 && fixedFee <= 0 && pctFee <= 0)) return null

  let doctorCost = 0
  if (feeType === 'hourly') doctorCost = hourlyFee * chairTime
  else if (feeType === 'fixed') doctorCost = fixedFee

  const overheadPerHour = gs.total_overhead_per_hour || 0
  const overheadCost    = overheadPerHour * chairTime

  let consumablesCost = 0
  serviceConsumables.value.forEach(r => { consumablesCost += consumableRowCost(r) })

  let materialsCost = 0
  serviceMaterials.value.forEach(r => { materialsCost += materialRowCost(r) })

  let equipmentCost = 0
  serviceEquipment.value.forEach(r => {
    if (!r.equipment_id || !r.hours_used) return
    const eq = perHourEquip.value.find(e => e.id == r.equipment_id)
    if (eq) {
      const lifeHours = eq.life_years * 12 * (eq.monthly_usage_hours || 160)
      equipmentCost += (eq.purchase_cost / lifeHours) * parseFloat(r.hours_used)
    }
  })

  let totalCost    = doctorCost + overheadCost + consumablesCost + materialsCost + equipmentCost
  const profitMargin = useDefaultProfit.value
    ? (gs.default_profit_percent || 40)
    : (parseFloat(customProfitPct.value) || 0)
  const vat     = gs.vat_percent || 0
  const round   = gs.rounding_nearest || 5

  // Margin semantics: profitMargin is % of price-before-VAT (not markup on cost)
  const marginFraction = Math.min(Math.max(profitMargin, 0), 99.99) / 100
  const marginDivisor  = 1 - marginFraction

  let calculatedPrice
  if (feeType === 'percentage') {
    const clinicCosts = overheadCost + consumablesCost + equipmentCost
    const labCosts    = materialsCost
    const vm = 1 + vat / 100
    const dp = pctFee / 100
    const clinicPrice = marginDivisor > 0 && dp < 1
      ? (clinicCosts * vm) / (marginDivisor * (1 - dp))
      : 0
    const labPrice    = marginDivisor > 0 ? (labCosts * vm) / marginDivisor : 0
    calculatedPrice   = Math.round((clinicPrice + labPrice) / round) * round
    const doctorFromPct = (calculatedPrice - labCosts) * dp
    totalCost = doctorFromPct + overheadCost + consumablesCost + materialsCost + equipmentCost
  } else {
    const priceBeforeVat = marginDivisor > 0 ? totalCost / marginDivisor : totalCost
    const raw = priceBeforeVat * (1 + vat / 100)
    calculatedPrice = Math.round(raw / round) * round
  }

  return {
    totalCost:       totalCost.toFixed(2),
    calculatedPrice: calculatedPrice.toFixed(2),
    profitMargin:    profitMargin.toFixed(0),
    currency:        gs.currency || 'EGP',
  }
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
  const price = row.use_master
    ? consumableUnitCost(row.consumable_id)
    : (parseFloat(row.custom_unit_price) || 0)
  return qty * price
}

function materialRowCost(row) {
  const qty = parseFloat(row.quantity) || 0
  if (row.use_master) {
    const m = allMaterials.value.find(x => x.id == row.material_id)
    return qty * (m?.unit_cost || 0)
  }
  return qty * (parseFloat(row.custom_unit_price) || 0)
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
  serviceConsumables.value.push({ consumable_id: '', quantity: 1, use_master: true, custom_unit_price: '' })
  openConsumables.value = true
}
function removeConsumableRow(idx) { serviceConsumables.value.splice(idx, 1) }
function onConsumableSelect(row) {
  if (!row.consumable_id) return
  if (!row.use_master && row.custom_unit_price === '') {
    row.custom_unit_price = consumableUnitCost(row.consumable_id).toFixed(3)
  }
}
function toggleConsumableMaster(row) {
  if (!row.use_master && row.custom_unit_price === '') {
    row.custom_unit_price = consumableUnitCost(row.consumable_id).toFixed(3)
  }
}

// ── Material management ───────────────────────────────────────
function addMaterialRow() {
  serviceMaterials.value.push({ material_id: '', quantity: 1, use_master: true, custom_unit_price: '' })
  openMaterials.value = true
}
function removeMaterialRow(idx) { serviceMaterials.value.splice(idx, 1) }
function onMaterialSelect(row) {
  if (!row.material_id) return
  const m = allMaterials.value.find(x => x.id == row.material_id)
  if (m && !row.use_master && row.custom_unit_price === '') {
    row.custom_unit_price = (m.unit_cost || 0).toFixed(3)
  }
}
function toggleMaterialMaster(row) {
  if (!row.use_master && row.custom_unit_price === '') {
    const m = allMaterials.value.find(x => x.id == row.material_id)
    row.custom_unit_price = m ? (m.unit_cost || 0).toFixed(3) : ''
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
  wasUnderpriced.value = false  // new service, not fixing an underpriced one
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

  // Check if service is currently underpriced for profit_protector achievement tracking
  const priceData = (pricingStore.priceList || []).find(p => p.id === s.id)
  if (priceData && priceData.rounded_price > 0 && priceData.current_price > 0) {
    wasUnderpriced.value = priceData.current_price < priceData.rounded_price * 0.95
  } else {
    wasUnderpriced.value = false
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
        use_master:        sc.custom_unit_price == null,
        custom_unit_price: sc.custom_unit_price != null ? sc.custom_unit_price : '',
      }))
      openConsumables.value = true
    }
    if (data.materials?.length) {
      serviceMaterials.value = data.materials.map(sm => ({
        material_id:       sm.material_id,
        quantity:          sm.quantity,
        use_master:        sm.custom_unit_price == null,
        custom_unit_price: sm.custom_unit_price != null ? sm.custom_unit_price : '',
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
      .map(r => ({
        consumable_id:     parseInt(r.consumable_id),
        quantity:          parseFloat(r.quantity),
        custom_unit_price: r.use_master ? null : (parseFloat(r.custom_unit_price) || null),
      })),
    materials: serviceMaterials.value
      .filter(r => r.material_id && r.quantity)
      .map(r => ({
        material_id:       parseInt(r.material_id),
        quantity:          parseFloat(r.quantity),
        custom_unit_price: r.use_master ? null : (parseFloat(r.custom_unit_price) || null),
      })),
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

      // Track if user fixed an underpriced service (profit_protector achievement)
      if (wasUnderpriced.value && payload.current_price != null) {
        const priceData = (pricingStore.priceList || []).find(p => p.id === editingId.value)
        if (priceData && priceData.rounded_price > 0) {
          const newPrice = parseFloat(payload.current_price)
          const healthyThreshold = priceData.rounded_price * 0.95
          if (newPrice >= healthyThreshold) {
            trackPriceFix()
          }
        }
      }
    } else {
      await pricingStore.createService(payload)
    }
    // Close modal and clear saving immediately — don't wait on background refreshes
    showModal.value = false
    saving.value    = false
    wasUnderpriced.value = false
    pricingStore.loadServices().catch(() => {})
    pricingStore.loadPriceList().catch(() => {})
  } catch (e) {
    console.error(e)
    saving.value = false
  }
}

async function openDetail(row) {
  viewingRow.value   = row
  viewingPrice.value = null
  loadingPrice.value = true
  try {
    const { data } = await axios.get(`/api/services/${row.id}/price`, { withCredentials: true })
    viewingPrice.value = data
  } catch { /* show basic info only */ }
  loadingPrice.value = false
}

async function deleteService(id) {
  await pricingStore.deleteService(id)
  confirmDeleteId.value = null
}

async function loadTemplate() {
  loadingTemplate.value = true
  try {
    // Create all common services
    for (const svc of COMMON_SERVICES) {
      await pricingStore.createService(svc)
    }
    // Reload services list
    await pricingStore.loadServices()
    await pricingStore.loadPriceList()
  } catch (e) {
    console.error('Failed to load template:', e)
  } finally {
    loadingTemplate.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    pricingStore.loadSetupStatus().catch(() => {}),
    pricingStore.loadServices(),
    pricingStore.loadPriceList().catch(() => {}),
    clinicStore.loadAll().catch(() => {}),
  ])
  try {
    const { data } = await axios.get('/api/settings/global', { withCredentials: true })
    globalSettings.value = data
  } catch { /* non-critical */ }
})
</script>

<template>
  <AppShell active-key="services">
    <!-- Premium page header -->
    <PageHeader
      :title="isAr ? 'الخدمات' : 'Services'"
      :subtitle="isAr ? 'كل إجراء بوقت الكرسي والخامات وأتعاب الطبيب.' : 'Every procedure with its chair time, materials, and doctor fee.'"
      icon="Stethoscope"
    >
      <template #actions>
        <div class="search-wrap">
          <DpcIcon name="Search" :size="15" :stroke-width="1.6" class="search-icon" />
          <input v-model="searchQ" :placeholder="isAr ? 'ابحث...' : 'Search...'" class="search-input" />
        </div>
        <DpcBtn variant="teal" size="sm" icon="Plus" @click="openAdd">
          {{ isAr ? 'خدمة جديدة' : 'New service' }}
        </DpcBtn>
        <LangSwitch />
      </template>
    </PageHeader>

    <!-- Lockout wall -->
    <div v-if="isLockout" class="lockout-wall">
      <div class="lockout-icon"><DpcIcon name="Shield" :size="32" :stroke-width="1.4" /></div>
      <h3 class="lockout-title">{{ isAr ? 'انتهت التجربة المجانية' : 'Trial ended' }}</h3>
      <p class="lockout-body">{{ isAr ? 'قم بالترقية للوصول إلى الخدمات.' : 'Upgrade your subscription to access services.' }}</p>
      <DpcBtn variant="teal" @click="router.push('/app/subscription')">{{ isAr ? 'عرض الخطط' : 'View plans' }}</DpcBtn>
    </div>

    <div v-else class="svc-body">
      <!-- Trial banner with premium AlertBanner -->
      <AlertBanner
        v-if="isTrial"
        variant="info"
        :message="isAr ? 'وضع التجربة — التكاليف مخفية.' : 'Trial mode — cost figures are blurred.'"
        icon="Info"
        class="animate-fade-in-down"
        style="margin-bottom: 20px;"
      />

      <!-- Coverage bar with animation -->
      <DpcCoverageBar
        class="coverage-bar-section animate-fade-in-up"
        :total-services="pricingStore.services.length"
        :priced-services="pricedServicesCount"
        :underpriced-services="underpricedServicesCount"
        :missing-consumables="missingConsumablesCount"
        @filter="handleCoverageFilter"
        style="animation-delay: var(--stagger-1);"
      />

      <!-- Services table with animation -->
      <DpcTable
        class="animate-fade-in-up services-table-premium"
        :empty="rows.length === 0"
        :empty-icon="searchQ ? 'Search' : 'Stethoscope'"
        :empty-message="searchQ ? (isAr ? 'لا توجد نتائج' : 'No services match') : (isAr ? 'ابدأ بإضافة خدماتك' : 'Start by adding your services')"
        style="animation-delay: var(--stagger-2);"
      >
        <template v-if="!searchQ" #empty-action>
          <p class="empty-desc">
            {{ isAr ? 'احصل على 10 خدمات شائعة في ثوانٍ، أو ابدأ من الصفر' : 'Get 10 common dental services in seconds, or start from scratch' }}
          </p>
          <div class="empty-actions">
            <DpcBtn variant="teal" icon="Zap" :loading="loadingTemplate" @click="loadTemplate">
              {{ isAr ? 'تحميل 10 خدمات شائعة' : 'Load 10 common services' }}
            </DpcBtn>
            <DpcBtn variant="secondary" icon="Plus" @click="openAdd">
              {{ isAr ? 'إضافة يدوياً' : 'Add manually' }}
            </DpcBtn>
          </div>
        </template>

        <div class="services-table-grid">
          <DpcTableHead>
            <DpcTableRow variant="header">
              <DpcTableCell type="header">{{ isAr ? 'اسم الخدمة' : 'Service name' }}</DpcTableCell>
              <DpcTableCell type="header" align="center">{{ isAr ? 'وقت الكرسي' : 'Chair time' }}</DpcTableCell>
              <DpcTableCell type="header">{{ isAr ? 'أتعاب الطبيب' : 'Doctor fee' }}</DpcTableCell>
              <DpcTableCell type="header">{{ isAr ? 'المعدة' : 'Equipment' }}</DpcTableCell>
              <DpcTableCell type="header" align="center">{{ isAr ? 'حالة التسعير' : 'Pricing status' }}</DpcTableCell>
              <DpcTableCell type="header"></DpcTableCell>
            </DpcTableRow>
          </DpcTableHead>

          <DpcTableRow
            v-for="row in rows"
            :key="row.id"
            @click="openDetail(row)"
          >
            <DpcTableCell type="text" class="svc-cell-name">
              <div class="svc-cell">
                <div class="svc-icon"><DpcIcon name="Stethoscope" :size="14" :stroke-width="1.7" /></div>
                <div>
                  <div class="svc-name">{{ svcName(row) }}</div>
                  <div v-if="row.category_name" class="svc-cat">{{ row.category_name }}</div>
                </div>
              </div>
            </DpcTableCell>
            <DpcTableCell type="number" align="center" :label="isAr ? 'وقت الكرسي' : 'Chair time'">
              {{ row.chair_time_hours }}<span class="t-unit">{{ isAr ? 'سا' : 'hr' }}</span>
            </DpcTableCell>
            <DpcTableCell type="text" :label="isAr ? 'أتعاب الطبيب' : 'Doctor fee'">
              <span class="t-sm">{{ doctorFeeDisplay(row) }}</span>
            </DpcTableCell>
            <DpcTableCell type="text" :label="isAr ? 'المعدة' : 'Equipment'">
              <span class="t-sm text-faint">{{ row.equipment_name || '—' }}</span>
            </DpcTableCell>
            <DpcTableCell type="status" align="center" :label="isAr ? 'حالة التسعير' : 'Status'">
              <span v-if="pricingStatus(row) === 'good'" class="status-chip chip-good">✓ {{ isAr ? 'جيد' : 'Good' }}</span>
              <span v-else-if="pricingStatus(row) === 'low'" class="status-chip chip-low">⚠ {{ isAr ? 'منخفض' : 'Low' }}</span>
              <span v-else class="status-chip chip-unset">{{ isAr ? 'غير محدد' : 'Unset' }}</span>
            </DpcTableCell>
            <DpcTableCell type="action" class="svc-cell-actions">
              <div class="actions-cell">
                <DpcBtn variant="ghost" size="xs" square icon="Eye" :aria-label="isAr ? 'تفاصيل السعر' : 'Price details'" @click.stop="openDetail(row)" />
                <DpcBtn variant="ghost" size="xs" square icon="Pencil" :aria-label="isAr ? 'تعديل' : 'Edit'" @click.stop="openEdit(row)" />
                <DpcBtn variant="ghost" size="xs" square icon="Trash2" :aria-label="isAr ? 'حذف' : 'Delete'" class="del-btn" @click.stop="confirmDeleteId = row.id" />
              </div>
            </DpcTableCell>
          </DpcTableRow>
        </div>
      </DpcTable>
    </div>

    <!-- ── Add / Edit modal ──────────────────────────────────── -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="dpc-h modal-title">{{ editingId ? (isAr ? '✏️ تعديل خدمة' : '✏️ Edit service') : (isAr ? '🦷 خدمة جديدة' : '🦷 New service') }}</h2>
          <DpcBtn variant="ghost" size="xs" square icon="X" aria-label="Close" @click="showModal = false" />
        </div>

        <!-- ── Live Price Preview Band (frozen above scroll) ── -->
        <div v-if="livePrice" class="modal-price-band">
          <Transition name="preview-card">
            <div :class="['price-preview-card', isTrial && 'preview-locked']">
              <div class="preview-header">
                <span class="preview-label">
                  {{ isAr ? '🧮 السعر المحسوب' : '🧮 Calculated price' }}
                </span>
                <span v-if="isTrial" class="preview-lock-icon">🔒</span>
              </div>
              <div class="preview-amount" :class="isTrial && 'trial-blur'">
                <span class="preview-num">{{ livePrice.calculatedPrice }}</span>
                <span class="preview-currency">{{ livePrice.currency }}</span>
              </div>
              <div class="preview-breakdown" :class="isTrial && 'trial-blur'">
                <div class="preview-item">
                  <span class="preview-item-label">{{ isAr ? '💰 التكلفة الكلية' : '💰 Total cost' }}</span>
                  <span class="preview-item-value">{{ livePrice.totalCost }}</span>
                </div>
                <div class="preview-item">
                  <span class="preview-item-label">{{ isAr ? '📈 هامش الربح' : '📈 Profit margin' }}</span>
                  <span class="preview-item-value">{{ livePrice.profitMargin }}%</span>
                </div>
              </div>
            </div>
          </Transition>
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
              <DpcBtn variant="secondary" size="sm" @click="form.chair_time_hours = 0.25">15m</DpcBtn>
              <DpcBtn variant="secondary" size="sm" @click="form.chair_time_hours = 0.5">30m</DpcBtn>
              <DpcBtn variant="secondary" size="sm" @click="form.chair_time_hours = 0.75">45m</DpcBtn>
              <DpcBtn variant="secondary" size="sm" @click="form.chair_time_hours = 1">1hr</DpcBtn>
              <DpcBtn variant="secondary" size="sm" @click="form.chair_time_hours = 1.5">1.5hr</DpcBtn>
              <DpcBtn variant="secondary" size="sm" @click="form.chair_time_hours = 2">2hr</DpcBtn>
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
          <div :class="['coll-section', openConsumables && 'is-open']">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openConsumables = !openConsumables">
                <span :class="['toggle-icon', openConsumables && 'is-open']">
                  <DpcIcon name="Plus" :size="14" :stroke-width="2.5" />
                </span>
                <span class="coll-title">{{ isAr ? '🧪 المستهلكات' : '🧪 Consumables' }}</span>
                <span class="coll-badge" :class="serviceConsumables.length && 'badge-active'">
                  {{ serviceConsumables.length > 0 ? serviceConsumables.length + ' ' + (isAr ? 'عناصر' : 'items') : (isAr ? 'اختياري' : 'Optional') }}
                </span>
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
                <input v-model.number="row.quantity" type="number" step="1" min="1" class="item-input" :placeholder="isAr ? 'كمية' : 'Qty'" />
                <div class="unit-price-cell">
                  <label class="master-toggle" :title="isAr ? 'استخدام السعر الافتراضي من المصدر' : 'Use default price from catalog'">
                    <input type="checkbox" v-model="row.use_master" @change="toggleConsumableMaster(row)" />
                    <span class="master-label">{{ isAr ? 'افتراضي' : 'Default' }}</span>
                  </label>
                  <span v-if="row.use_master" class="master-price-badge">
                    {{ fmtCost(consumableUnitCost(row.consumable_id)) }}
                  </span>
                  <input v-else v-model="row.custom_unit_price" type="number" step="0.01" min="0" class="item-input price-override-input" :placeholder="isAr ? 'سعر/وحدة' : 'Unit price'" />
                </div>
                <span class="item-cost">{{ fmtCost(consumableRowCost(row)) }}</span>
                <button type="button" class="item-del" @click="removeConsumableRow(idx)"><DpcIcon name="X" :size="12" :stroke-width="2.5" /></button>
              </div>
              <p v-if="!serviceConsumables.length" class="coll-empty">{{ isAr ? 'اضغط «إضافة» لإضافة مستهلكات.' : 'Click «Add» to add consumables.' }}</p>
            </div>
          </div>

          <!-- ── Collapsible: Lab Materials ─────────────────── -->
          <div :class="['coll-section', openMaterials && 'is-open']">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openMaterials = !openMaterials">
                <span :class="['toggle-icon', openMaterials && 'is-open']">
                  <DpcIcon name="Plus" :size="14" :stroke-width="2.5" />
                </span>
                <span class="coll-title">{{ isAr ? '🔬 مواد المعمل' : '🔬 Lab Materials' }}</span>
                <span class="coll-badge" :class="serviceMaterials.length && 'badge-active'">
                  {{ serviceMaterials.length > 0 ? serviceMaterials.length + ' ' + (isAr ? 'عناصر' : 'items') : (isAr ? 'اختياري' : 'Optional') }}
                </span>
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
                <input v-model.number="row.quantity" type="number" step="1" min="1" class="item-input" :placeholder="isAr ? 'كمية' : 'Qty'" />
                <div class="unit-price-cell">
                  <label class="master-toggle" :title="isAr ? 'استخدام السعر الافتراضي من المصدر' : 'Use default price from catalog'">
                    <input type="checkbox" v-model="row.use_master" @change="toggleMaterialMaster(row)" />
                    <span class="master-label">{{ isAr ? 'افتراضي' : 'Default' }}</span>
                  </label>
                  <span v-if="row.use_master" class="master-price-badge">
                    {{ fmtCost(allMaterials.find(x => x.id == row.material_id)?.unit_cost || 0) }}
                  </span>
                  <input v-else v-model="row.custom_unit_price" type="number" step="0.01" min="0" class="item-input price-override-input" :placeholder="isAr ? 'سعر/وحدة' : 'Unit price'" />
                </div>
                <span class="item-cost">{{ fmtCost(materialRowCost(row)) }}</span>
                <button type="button" class="item-del" @click="removeMaterialRow(idx)"><DpcIcon name="X" :size="12" :stroke-width="2.5" /></button>
              </div>
              <p v-if="!serviceMaterials.length" class="coll-empty">{{ isAr ? 'اضغط «إضافة» لإضافة مواد.' : 'Click «Add» to add materials.' }}</p>
            </div>
          </div>

          <!-- ── Collapsible: Special Equipment ────────────── -->
          <div :class="['coll-section', openEquipment && 'is-open']">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openEquipment = !openEquipment">
                <span :class="['toggle-icon', openEquipment && 'is-open']">
                  <DpcIcon name="Plus" :size="14" :stroke-width="2.5" />
                </span>
                <span class="coll-title">{{ isAr ? '⚙️ معدات خاصة' : '⚙️ Special Equipment' }}</span>
                <span class="coll-badge" :class="serviceEquipment.length && 'badge-active'">
                  {{ serviceEquipment.length > 0 ? serviceEquipment.length + ' ' + (isAr ? 'عناصر' : 'items') : (isAr ? 'اختياري' : 'Optional') }}
                </span>
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
                <input v-model.number="row.hours_used" type="number" step="0.25" min="0.25" class="item-input" placeholder="0.25" />
                <button type="button" class="item-del" @click="removeEquipmentRow(idx)"><DpcIcon name="X" :size="12" :stroke-width="2.5" /></button>
              </div>
              <p v-if="!serviceEquipment.length" class="coll-empty">{{ isAr ? 'اضغط «إضافة» لإضافة معدة.' : 'Click «Add» to add equipment.' }}</p>
            </div>
          </div>

          <!-- ── Collapsible: Custom Profit ─────────────────── -->
          <div :class="['coll-section', openCustomProfit && 'is-open']">
            <div class="coll-header">
              <button type="button" class="coll-toggle" @click="openCustomProfit = !openCustomProfit">
                <span :class="['toggle-icon', openCustomProfit && 'is-open']">
                  <DpcIcon name="Plus" :size="14" :stroke-width="2.5" />
                </span>
                <span class="coll-title">{{ isAr ? '💹 تسعير مخصص' : '💹 Custom Pricing' }}</span>
                <span class="coll-badge" :class="!useDefaultProfit && 'badge-active'">
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
                  <input v-model="customProfitPct" type="number" step="1" min="0" max="99" class="modal-input" style="flex:1;min-width:0" placeholder="e.g., 50" />
                  <span class="unit-lbl">%</span>
                </div>
                <p class="field-hint">{{ isAr ? 'يُطبَّق على هذه الخدمة فقط بدلاً من الهامش العام.' : 'Applied to this service only, overriding the global margin.' }}</p>
              </div>
            </div>
          </div>

        </div><!-- /modal-body -->

        <div class="modal-footer">
          <DpcBtn variant="ghost" @click="showModal = false">{{ isAr ? 'إلغاء' : 'Cancel' }}</DpcBtn>
          <DpcBtn variant="teal" :loading="saving" :disabled="!form.name" @click="saveService">
            {{ editingId ? (isAr ? 'حفظ التعديلات' : 'Save changes') : (isAr ? 'إضافة الخدمة' : 'Add service') }}
          </DpcBtn>
        </div>
      </div>
    </div>

    <!-- ── Confirm delete ──────────────────────────────────── -->
    <div v-if="confirmDeleteId" class="modal-overlay" @click.self="confirmDeleteId = null">
      <div class="modal-box confirm-box">
        <div class="dpc-h modal-title" style="padding:20px 24px;">{{ isAr ? 'تأكيد الحذف' : 'Confirm delete' }}</div>
        <p class="confirm-text">{{ isAr ? 'هل تريد حذف هذه الخدمة؟ لا يمكن التراجع.' : 'Delete this service? This cannot be undone.' }}</p>
        <div class="modal-footer">
          <DpcBtn variant="ghost" @click="confirmDeleteId = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</DpcBtn>
          <DpcBtn variant="danger" @click="deleteService(confirmDeleteId)">{{ isAr ? 'حذف' : 'Delete' }}</DpcBtn>
        </div>
      </div>
    </div>

    <!-- ── Price detail modal ──────────────────────────────── -->
    <div v-if="viewingRow" class="modal-overlay" @click.self="viewingRow = null">
      <div class="modal-box price-detail-box">
        <div class="modal-header">
          <div>
            <div class="eyebrow-teal">🦷 {{ viewingRow.category_name || (isAr ? 'خدمة' : 'Service') }}</div>
            <h2 class="dpc-h modal-title">{{ svcName(viewingRow) }}</h2>
          </div>
          <DpcBtn variant="ghost" size="xs" square icon="X" aria-label="Close" @click="viewingRow = null" />
        </div>

        <!-- Loading skeleton -->
        <div v-if="loadingPrice" class="detail-loading">
          <div class="detail-skeleton" v-for="i in 6" :key="i"></div>
        </div>

        <div v-else-if="viewingPrice" class="detail-body">

          <!-- Recommended price hero -->
          <div class="detail-hero" :class="isTrial && 'detail-hero-locked'">
            <div class="detail-hero-label">{{ isAr ? '💰 السعر الموصى به' : '💰 Recommended price' }}</div>
            <div class="detail-hero-price" :class="isTrial && 'trial-blur'">
              {{ fmt(viewingPrice.rounded_price) }}
              <span class="detail-hero-currency">{{ globalSettings?.currency || 'EGP' }}</span>
            </div>
            <div class="detail-hero-sub" :class="isTrial && 'trial-blur'">
              {{ isAr ? 'التكلفة الكلية:' : 'Total cost:' }} <strong>{{ fmt(viewingPrice.total_cost) }}</strong>
              &nbsp;·&nbsp;
              {{ isAr ? 'الربح:' : 'Profit:' }} <strong>{{ viewingPrice.profit_percent }}%</strong>
            </div>
          </div>

          <!-- Variance vs current price -->
          <div v-if="viewingRow.current_price" class="variance-card"
            :class="viewingPrice.rounded_price > viewingRow.current_price * 1.05 ? 'variance-under' : 'variance-ok'">
            <div class="variance-icon">
              {{ viewingPrice.rounded_price > viewingRow.current_price * 1.05 ? '⚠️' : '✅' }}
            </div>
            <div class="variance-text">
              <div class="variance-title">
                {{ viewingPrice.rounded_price > viewingRow.current_price * 1.05
                  ? (isAr ? 'سعرك الحالي أقل من الموصى به' : 'Your price is below recommended')
                  : (isAr ? 'سعرك في النطاق الصحيح' : 'Your price is in the right range') }}
              </div>
              <div class="variance-detail">
                {{ isAr ? 'سعرك الحالي:' : 'Current price:' }} <strong>{{ fmt(viewingRow.current_price) }}</strong>
                &nbsp;→&nbsp;
                {{ isAr ? 'الفرق:' : 'Difference:' }}
                <strong>{{ viewingPrice.rounded_price > viewingRow.current_price ? '+' : '' }}{{ fmt(viewingPrice.rounded_price - viewingRow.current_price) }}</strong>
              </div>
            </div>
          </div>

          <!-- Cost breakdown section -->
          <div class="breakdown-section">
            <div class="breakdown-title">{{ isAr ? '📊 تفصيل التكلفة' : '📊 Cost breakdown' }}</div>

            <!-- Chair time cost with sub-breakdown -->
            <div class="breakdown-row">
              <div class="breakdown-label">
                <span class="breakdown-emoji">🪑</span>
                {{ isAr ? 'تكلفة وقت الكرسي' : 'Chair time cost' }}
                <span class="breakdown-sub">{{ viewingRow.chair_time_hours }}{{ isAr ? ' سا' : ' hr' }} × {{ fmt(viewingPrice.chair_hourly_rate) }}/{{ isAr ? 'سا' : 'hr' }}</span>
              </div>
              <span class="breakdown-value" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.chair_time_cost) }}</span>
            </div>

            <!-- Chair hourly rate sub-breakdown -->
            <div class="breakdown-subitems">
              <div class="sub-row"><span>🏢 {{ isAr ? 'تكاليف ثابتة شهرية' : 'Monthly fixed costs' }}</span><span :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.monthly_fixed_costs) }}</span></div>
              <div class="sub-row"><span>👥 {{ isAr ? 'رواتب' : 'Salaries' }}</span><span :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.monthly_salaries) }}</span></div>
              <div class="sub-row"><span>🔧 {{ isAr ? 'إهلاك معدات' : 'Equipment depreciation' }}</span><span :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.monthly_depreciation) }}</span></div>
              <div class="sub-row sub-total"><span>{{ isAr ? 'الإجمالي الشهري ÷ ' : 'Monthly total ÷ ' }}{{ Math.round(viewingPrice.effective_hours) }}{{ isAr ? ' سا فعالة' : ' effective hrs' }}</span><span :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.chair_hourly_rate) }}/{{ isAr ? 'سا' : 'hr' }}</span></div>
            </div>

            <div class="breakdown-row">
              <div class="breakdown-label">
                <span class="breakdown-emoji">👨‍⚕️</span>
                {{ isAr ? 'أتعاب الطبيب' : 'Doctor fee' }}
                <span class="breakdown-sub">{{ doctorFeeDisplay(viewingRow) }}</span>
              </div>
              <span class="breakdown-value" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.doctor_fee) }}</span>
            </div>

            <div class="breakdown-row" v-if="viewingPrice.equipment_cost > 0">
              <div class="breakdown-label">
                <span class="breakdown-emoji">⚙️</span>
                {{ isAr ? 'تكلفة المعدات الخاصة' : 'Special equipment cost' }}
              </div>
              <span class="breakdown-value" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.equipment_cost) }}</span>
            </div>

            <div class="breakdown-row" v-if="viewingPrice.materials_cost > 0">
              <div class="breakdown-label">
                <span class="breakdown-emoji">🔬</span>
                {{ isAr ? 'مواد ومستهلكات' : 'Materials & consumables' }}
              </div>
              <span class="breakdown-value" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.materials_cost) }}</span>
            </div>

            <div class="breakdown-row breakdown-total">
              <div class="breakdown-label"><span class="breakdown-emoji">💼</span>{{ isAr ? 'إجمالي التكلفة' : 'Total cost' }}</div>
              <span class="breakdown-value" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.total_cost) }}</span>
            </div>
          </div>

          <!-- Pricing section -->
          <div class="breakdown-section">
            <div class="breakdown-title">{{ isAr ? '📈 التسعير' : '📈 Pricing' }}</div>
            <div class="breakdown-row">
              <div class="breakdown-label"><span class="breakdown-emoji">📊</span>{{ isAr ? 'هامش الربح' : 'Profit margin' }} ({{ viewingPrice.profit_percent }}%)</div>
              <span class="breakdown-value" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.profit_amount) }}</span>
            </div>
            <div class="breakdown-row" v-if="viewingPrice.vat_percent > 0">
              <div class="breakdown-label"><span class="breakdown-emoji">🧾</span>{{ isAr ? 'ضريبة القيمة المضافة' : 'VAT' }} ({{ viewingPrice.vat_percent }}%)</div>
              <span class="breakdown-value" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.vat_amount) }}</span>
            </div>
            <div class="breakdown-row breakdown-final">
              <div class="breakdown-label"><span class="breakdown-emoji">🏷️</span>{{ isAr ? 'السعر الموصى به' : 'Recommended price' }}</div>
              <span class="breakdown-value final-val" :class="isTrial && 'trial-blur'">{{ fmt(viewingPrice.rounded_price) }}</span>
            </div>
          </div>
        </div>

        <!-- Fallback: basic info if price API unavailable -->
        <div v-else class="detail-body">
          <div class="detail-row"><span>{{ isAr ? 'وقت الكرسي' : 'Chair time' }}</span><span class="dpc-num">{{ viewingRow.chair_time_hours }}{{ isAr ? ' سا' : ' hr' }}</span></div>
          <div class="detail-row"><span>{{ isAr ? 'أتعاب الطبيب' : 'Doctor fee' }}</span><span>{{ doctorFeeDisplay(viewingRow) }}</span></div>
          <div v-if="viewingRow.current_price" class="detail-row">
            <span>{{ isAr ? 'سعرك الحالي' : 'Current price' }}</span>
            <span class="dpc-num">{{ fmt(viewingRow.current_price) }}</span>
          </div>
        </div>

        <div class="modal-footer">
          <DpcBtn variant="ghost" @click="viewingRow = null">{{ isAr ? 'إغلاق' : 'Close' }}</DpcBtn>
          <DpcBtn variant="teal" icon="Pencil" @click="openEdit(viewingRow); viewingRow = null">
            {{ isAr ? 'تعديل' : 'Edit' }}
          </DpcBtn>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
/* ── Search & Actions ─────────────────────────────────────── */
.header-actions { display: flex; gap: 8px; align-items: center; }
.search-wrap { position: relative; }
.search-icon { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-400); pointer-events: none; }
.search-input {
  height: 36px; padding: 0 14px 0 36px; width: 240px;
  border-radius: 10px; background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px; outline: none; border: none;
  transition: all var(--duration-fast);
}
.search-input:focus {
  box-shadow: inset 0 0 0 2px var(--teal-600);
  background: var(--paper);
}

/* ── Services body ────────────────────────────────────────── */
.svc-body { padding: 20px 28px 28px; }
.coverage-bar-section { margin-bottom: 16px; }

/* ── Premium Table ────────────────────────────────────────── */
.services-table-premium {
  background: var(--surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.services-table-grid {
  display: grid;
  grid-template-columns: minmax(0,2fr) 110px minmax(0,1.2fr) minmax(0,1.2fr) 130px 90px;
  align-items: center;
  width: 100%;
}

/* Premium row hover effects */
.services-table-grid :deep(.dpc-table-row:not(.dpc-table-row--header)) {
  cursor: pointer;
  transition: all var(--duration-fast);
  position: relative;
}

.services-table-grid :deep(.dpc-table-row:not(.dpc-table-row--header):hover) {
  background: var(--paper-2);
  transform: translateX(2px);
  box-shadow: -3px 0 0 0 var(--teal-600) inset;
}

.services-table-grid :deep(.dpc-table-row:not(.dpc-table-row--header):active) {
  transform: translateX(0);
}

.svc-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.svc-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  flex: none;
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--teal-100);
  transition: all var(--duration-fast);
}

.services-table-grid :deep(.dpc-table-row:hover) .svc-icon {
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

.services-table-grid :deep(.dpc-table-row:hover) .svc-name {
  color: var(--teal-700);
}

.svc-cat {
  font-size: 11px;
  color: var(--ink-500);
}

.t-sm       { font-size: 13px; color: var(--ink-700); }
.t-unit     { font-size: 10px; color: var(--ink-500); margin-inline-start: 2px; }
.text-faint { color: var(--ink-500); }

.status-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 4px 10px; border-radius: var(--radius-full);
  font-size: 10.5px; font-weight: 600;
  transition: all var(--duration-fast);
  box-shadow: inset 0 0 0 1px transparent;
}
.chip-good {
  background: var(--teal-50);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1px var(--teal-100);
}
.chip-good:hover {
  background: var(--teal-100);
  box-shadow: inset 0 0 0 1px var(--teal-200);
}
.chip-low {
  background: var(--warning-50);
  color: var(--warning-700);
  box-shadow: inset 0 0 0 1px var(--warning-100);
  animation: pulse-warning 2s ease-in-out infinite;
}
.chip-unset {
  background: var(--paper-2);
  color: var(--ink-500);
  box-shadow: inset 0 0 0 1px var(--line);
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--duration-fast);
}

.services-table-grid :deep(.dpc-table-row:hover) .actions-cell {
  opacity: 1;
}

.del-btn:hover {
  background: var(--danger-50) !important;
  color: var(--danger-700) !important;
}

/* Premium empty state */
.empty-icon {
  animation: float 4s var(--ease-in-out-expo, cubic-bezier(0.87, 0, 0.13, 1)) infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.empty-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0;
  letter-spacing: -0.01em;
}
.empty-desc {
  font-size: 14px;
  color: var(--ink-600);
  margin: 0;
  max-width: 400px;
  line-height: 1.6;
}
.empty-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ── Premium Modal ────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(4px);
  display: grid; place-items: center;
  z-index: 100;
  animation: modal-fade-in 0.2s var(--ease-out-expo);
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(4px);
  }
}

.modal-box {
  background: var(--surface);
  border-radius: 16px;
  width: 660px;
  box-shadow: 0 20px 60px rgba(0,0,0,.13), 0 0 0 1px rgba(0,0,0,.05);
  overflow: hidden;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  animation: modal-slide-up 0.3s var(--ease-out-expo);
}

@keyframes modal-slide-up {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.confirm-box   {
  width: 380px;
  animation: modal-slide-up 0.25s var(--ease-out-expo);
}
.price-detail-box {
  width: 540px;
  animation: modal-slide-up 0.3s var(--ease-out-expo);
}
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
  border-radius: 8px; background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13.5px; border: none; outline: none;
  box-sizing: border-box;
  transition: all var(--duration-fast);
}
.modal-input:hover {
  background: var(--paper);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.modal-input:focus {
  box-shadow: inset 0 0 0 2px var(--teal-600);
  background: var(--paper);
}

.input-row { display: flex; align-items: center; gap: 6px; }
.unit-lbl { font-size: 14px; font-weight: 600; color: var(--ink-500); white-space: nowrap; }

/* ── Live price preview card ──────────────────────────────── */
.modal-price-band {
  flex: none;
  padding: 0 24px 16px;
  border-bottom: 1px solid var(--line);
}

.price-preview-card {
  background: linear-gradient(135deg, var(--teal-600), var(--navy-700));
  border-radius: 14px;
  padding: 20px 22px;
  color: #fff;
  box-shadow: 0 4px 20px rgba(20,184,166,.28);
  animation: slideDown 0.25s ease;
  flex-shrink: 0;
}
.price-preview-card.preview-locked { filter: none; }
.preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.preview-label  { font-size: 12.5px; font-weight: 600; opacity: .88; }
.preview-lock-icon { font-size: 16px; }
.preview-amount {
  display: flex; align-items: baseline; gap: 8px;
  font-size: 32px; font-weight: 700; font-family: var(--font-mono); margin-bottom: 14px;
}
.preview-currency { font-size: 15px; opacity: .75; font-weight: 500; }
.preview-breakdown {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  padding-top: 12px; border-top: 1px solid rgba(255,255,255,.18);
}
.preview-item       { display: flex; flex-direction: column; gap: 2px; }
.preview-item-label { font-size: 11px; opacity: .78; }
.preview-item-value { font-size: 13px; font-weight: 700; font-family: var(--font-mono); }
.trial-blur { filter: blur(5px); user-select: none; }

/* Preview card enter/leave animation */
.preview-card-enter-active, .preview-card-leave-active { transition: opacity .22s ease, transform .22s ease; }
.preview-card-enter-from { opacity: 0; transform: translateY(-10px) scale(.98); }
.preview-card-leave-to   { opacity: 0; transform: translateY(-6px) scale(.98); }

/* ── Premium Collapsible sections ─────────────────────────── */
.coll-section {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--paper-2);
  transition: all var(--duration-fast);
}
.coll-section.is-open {
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.coll-header {
  display: flex;
  align-items: center;
  transition: all var(--duration-fast);
}
.coll-section.is-open .coll-header {
  border-bottom: 1px solid var(--line);
  background: var(--paper-2);
}

.coll-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  text-align: start;
  transition: background var(--duration-fast);
}
.coll-toggle:hover {
  background: var(--paper-3);
}
.coll-toggle:active {
  background: var(--paper-2);
}

/* + icon that rotates 45° to become × when open */
.toggle-icon {
  width: 24px; height: 24px; border-radius: 6px; flex: none;
  background: var(--ink-100); color: var(--ink-600);
  display: grid; place-items: center;
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.toggle-icon.is-open {
  background: var(--teal-600); color: #fff;
  transform: rotate(45deg);
}

.coll-title { font-size: 13px; font-weight: 600; color: var(--ink-800); flex: 1; }
.coll-badge {
  font-size: 11px; color: var(--ink-500);
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 99px; padding: 2px 8px;
  transition: background .15s, color .15s, border-color .15s;
}
.coll-badge.badge-active {
  background: var(--teal-50); color: var(--teal-700); border-color: var(--teal-200);
  font-weight: 600;
}

.coll-add-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 0 16px; height: 100%; min-height: 48px;
  font-size: 12px; font-weight: 600; color: var(--teal-700);
  cursor: pointer; border-inline-start: 1px solid var(--line);
  white-space: nowrap; flex: none;
}
.coll-add-btn:hover { background: var(--teal-50); }

.coll-body  { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.coll-empty { font-size: 12.5px; color: var(--ink-400); text-align: center; padding: 12px; margin: 0; background: var(--paper-2); border-radius: 8px; border: 1px dashed var(--line); }

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
  width: 100%;
  height: 34px;
  padding: 0 8px;
  border-radius: 7px;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px;
  border: none;
  outline: none;
  box-sizing: border-box;
  transition: all var(--duration-fast);
}
.item-input:hover {
  background: var(--paper);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.item-input:focus {
  box-shadow: inset 0 0 0 2px var(--teal-600);
  background: var(--paper);
}
.item-cost { font-size: 12.5px; font-weight: 500; color: var(--ink-700); text-align: end; }

.unit-price-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.master-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  width: fit-content;
}
.master-toggle input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: var(--teal-600);
  cursor: pointer;
  flex-shrink: 0;
}
.master-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--teal-700);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.master-price-badge {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-500);
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  border-radius: 6px;
  padding: 4px 8px;
  white-space: nowrap;
}
.price-override-input { margin-top: 0; }

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

/* ── Price detail modal ───────────────────────────────────── */
.price-detail-box { width: 540px; }
.eyebrow-teal { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--teal-700); margin-bottom: 3px; }

.detail-loading { padding: 24px; display: flex; flex-direction: column; gap: 10px; }
.detail-skeleton { height: 20px; border-radius: 6px; background: linear-gradient(90deg, var(--paper-2) 25%, var(--surface) 50%, var(--paper-2) 75%); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
.detail-skeleton:nth-child(2) { width: 75%; }
.detail-skeleton:nth-child(4) { width: 60%; }
.detail-skeleton:nth-child(6) { width: 80%; }
@keyframes shimmer { to { background-position: -200% 0; } }

.detail-body { padding: 0 0 8px; overflow-y: auto; max-height: 70vh; }

/* Premium hero recommended price */
.detail-hero {
  background: linear-gradient(135deg, var(--teal-600), var(--navy-700));
  padding: 24px;
  margin-bottom: 0;
  color: #fff;
  position: relative;
  overflow: hidden;
  animation: slide-in-right 0.3s var(--ease-out-expo);
}
.detail-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  animation: shimmer-hero 2s infinite;
}
.detail-hero-locked { opacity: .85; }
.detail-hero-label {
  font-size: 12px;
  font-weight: 600;
  opacity: .85;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}
.detail-hero-price {
  font-size: 38px;
  font-weight: 800;
  font-family: var(--font-mono);
  display: flex;
  align-items: baseline;
  gap: 8px;
  animation: scale-in 0.4s var(--ease-out-expo) 0.1s backwards;
}
.detail-hero-currency {
  font-size: 16px;
  opacity: .75;
  font-weight: 500;
}
.detail-hero-sub {
  font-size: 12.5px;
  opacity: .85;
  margin-top: 8px;
}

@keyframes shimmer-hero {
  to { left: 100%; }
}

/* Premium variance card */
.variance-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--line);
  animation: slide-in-right 0.3s var(--ease-out-expo);
}
.variance-under {
  background: var(--warning-50);
  box-shadow: inset 0 0 0 1px var(--warning-100);
}
.variance-ok {
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1px var(--teal-100);
}
.variance-icon {
  font-size: 22px;
  flex: none;
  animation: scale-in 0.4s var(--ease-bounce) 0.2s backwards;
}
.variance-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
}
.variance-detail {
  font-size: 12px;
  color: var(--ink-600);
  margin-top: 2px;
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Premium cost breakdown */
.breakdown-section {
  padding: 16px 24px;
  border-bottom: 1px solid var(--line);
  animation: fade-in 0.3s var(--ease-out-expo);
}
.breakdown-section:last-child { border-bottom: none; }
.breakdown-section:nth-child(1) { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
.breakdown-section:nth-child(2) { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
.breakdown-section:nth-child(3) { animation-delay: 0.3s; opacity: 0; animation-fill-mode: forwards; }

.breakdown-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink-500);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.breakdown-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 8px;
  margin: 0 -8px;
  border-bottom: 1px solid var(--line-2, #f0eeea);
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast);
}
.breakdown-row:hover {
  background: var(--paper-2);
}
.breakdown-row:last-child { border-bottom: none; }
.breakdown-label { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--ink-800); font-weight: 500; }
.breakdown-emoji { margin-inline-end: 5px; font-style: normal; }
.breakdown-sub   { font-size: 11px; color: var(--ink-500); font-weight: 400; padding-inline-start: 20px; }
.breakdown-value { font-size: 13px; font-weight: 600; font-family: var(--font-mono); color: var(--ink-900); white-space: nowrap; flex: none; }
.breakdown-total { border-top: 2px solid var(--line) !important; border-bottom: none !important; padding-top: 10px !important; }
.breakdown-total .breakdown-label { font-weight: 700; color: var(--ink-900); }
.breakdown-total .breakdown-value { color: var(--ink-900); }
.breakdown-final .breakdown-label { font-weight: 700; color: var(--teal-700); }
.final-val { font-size: 16px; color: var(--teal-700) !important; }

/* Sub-item breakdown (chair hourly rate) */
.breakdown-subitems { margin: 0 0 6px 20px; padding: 10px 12px; background: var(--paper-2); border-radius: 8px; box-shadow: inset 0 0 0 1px var(--line); }
.sub-row { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--ink-600); padding: 3px 0; gap: 8px; }
.sub-row span:last-child { font-family: var(--font-mono); font-weight: 500; white-space: nowrap; }
.sub-total { border-top: 1px dashed var(--line); margin-top: 4px; padding-top: 4px; font-weight: 600; color: var(--ink-800); }

/* ── Lockout / trial ──────────────────────────────────────── */
.lockout-wall  {
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
.lockout-icon  {
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
.lockout-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0;
}
.lockout-body  {
  font-size: 14px;
  color: var(--ink-500);
  max-width: 360px;
  margin: 0;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ──────────────────────────────────────────────────────────────
   RESPONSIVE — tighten outer padding, stack 2-col modal grids.
   Internal data tables retain their grid-template-columns and use
   horizontal scroll on phones (per Phase 3 fallback pattern).
   ────────────────────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .svc-body { padding: 16px var(--gutter, 16px) 24px; }
}

@media (max-width: 767px) {
  .svc-body { padding: 12px var(--gutter, 16px) 32px; }

  /* ───── Services table card-mode (same pattern as PriceList) ─────
     The 6-column grid is unreadable at phone widths and the global
     overflow-x: clip on body hides any spillover, so cells get
     clipped. Flatten each row into a vertical card with stacked
     label/value pairs surfaced from data-label. */
  .services-table-grid { display: block; grid-template-columns: none; }

  /* Hide the desktop header row — labels move inline. */
  .services-table-grid :deep(.dpc-table-head) { display: none; }

  /* Each row becomes a stacked card. */
  .services-table-grid :deep(.dpc-table-row.row-default) {
    display: block;
    grid-template-columns: none;
    padding: 14px var(--gutter, 16px);
    border-bottom: 1px solid var(--line);
    min-height: 0;
  }
  .services-table-grid :deep(.dpc-table-row.row-default:hover) {
    transform: none;
    box-shadow: none;
  }

  /* Service-name cell is the card title — full row, no inline label. */
  .services-table-grid :deep(.svc-cell-name) {
    padding: 0 0 10px;
    margin-bottom: 10px;
    border-bottom: 1px dashed var(--line-soft);
    align-items: flex-start;
  }

  /* Action buttons row sits at the bottom — no label. */
  .services-table-grid :deep(.svc-cell-actions) {
    padding: 10px 0 0;
    margin-top: 6px;
    border-top: 1px dashed var(--line-soft);
  }
  .services-table-grid :deep(.svc-cell-actions .actions-cell) {
    justify-content: flex-end;
  }

  /* All other cells stack label above value. */
  .services-table-grid :deep(.dpc-table-cell:not(.svc-cell-name):not(.svc-cell-actions)) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 6px 0;
    text-align: start;
    min-height: 0;
  }
  .services-table-grid :deep(.dpc-table-cell[data-label]:not(.svc-cell-name):not(.svc-cell-actions))::before {
    content: attr(data-label);
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-500);
    text-transform: none;
    letter-spacing: 0;
    margin-bottom: 4px;
    text-align: start;
  }
  /* Numeric/centered cells reset to start-aligned in card mode so
     values sit directly under their labels. */
  .services-table-grid :deep(.dpc-table-cell.align-end:not(.svc-cell-name):not(.svc-cell-actions)),
  .services-table-grid :deep(.dpc-table-cell.align-center:not(.svc-cell-name):not(.svc-cell-actions)) {
    align-items: stretch;
    text-align: start;
  }
  .services-table-grid :deep(.dpc-table-cell.align-end > *),
  .services-table-grid :deep(.dpc-table-cell.align-center > *) {
    text-align: start;
    justify-content: flex-start;
  }

  /* Service add/edit modal — switch 2-col fields to single column. */
  .modal-form .grid-2,
  .modal-body .grid-2 { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr !important; }

  /* The custom ServicesView modal becomes a true bottom sheet on
     phones. Backdrop is grid place-items: center on desktop — switch
     to bottom-aligned, full-width container with rounded top corners. */
  .modal-overlay { align-items: end; }

  .modal-box {
    width: 100%;
    max-width: none;
    max-height: 92vh;
    max-height: 92svh;
    border-radius: var(--radius-xl, 24px) var(--radius-xl, 24px) 0 0;
    animation: services-sheet-slide-up 0.3s var(--ease-out-expo);
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Override the original scale-up entry — slide from below instead. */
  @keyframes services-sheet-slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Inner padding for sheet form. */
  .modal-header,
  .modal-footer { padding-inline: 18px; }
  .modal-body   { padding-inline: 18px; }
  .confirm-text { padding-inline: 18px; }

  /* Confirm modal and price-detail variants should also fill width. */
  .confirm-box,
  .price-detail-box { width: 100%; }
  .confirm-box {
    border-radius: var(--radius-xl, 24px) var(--radius-xl, 24px) 0 0;
  }

  /* Internal preview-breakdown 2-col → 1-col on phones. */
  .preview-breakdown { grid-template-columns: 1fr 1fr; gap: 8px; }

  /* Internal item-row grids inside the modal body (consumables,
     materials, equipment) have fixed column widths that overflow on
     phones — let them scroll within the sheet's body. */
  .items-hdr,
  .cons-row,
  .equip-hdr,
  .equip-row { min-width: 360px; }
  .coll-body { overflow-x: auto; -webkit-overflow-scrolling: touch; }
}

/* RTL polish on the services list row hover — flip the inset accent
   bar to the start edge and the slide-into-focus direction. */
html[dir="rtl"] .services-table-grid :deep(.dpc-table-row:not(.dpc-table-row--header):hover) {
  transform: translateX(-2px);
  box-shadow: 3px 0 0 0 var(--teal-600) inset;
}
html[dir="rtl"] .services-table-grid :deep(.dpc-table-row:not(.dpc-table-row--header):active) {
  transform: translateX(0);
}
</style>
