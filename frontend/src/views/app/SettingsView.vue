<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useClinicStore } from '@/stores/clinic.js'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const clinicStore = useClinicStore()
const i18n        = useI18nStore()
const api         = axios.create({ withCredentials: true })
const isAr        = computed(() => i18n.locale === 'ar')

const activeTab = ref('costs')
const saving    = ref(false)

const tabs = computed(() => [
  { id: 'costs',    label: isAr.value ? 'التكاليف الثابتة' : 'Fixed costs',   icon: 'CircleDollarSign' },
  { id: 'salaries', label: isAr.value ? 'الرواتب'          : 'Salaries',       icon: 'Users' },
  { id: 'equipment',label: isAr.value ? 'المعدات'          : 'Equipment',      icon: 'Package' },
  { id: 'capacity', label: isAr.value ? 'الطاقة'           : 'Capacity',       icon: 'Clock' },
  { id: 'general',  label: isAr.value ? 'عام'              : 'General',        icon: 'Settings' },
])

// Editable copies of store data
const costRows   = ref([])
const salaryRows = ref([])
const equipRows  = ref([])

// Capacity fields
const capChairs   = ref(2)
const capHours    = ref(8)
const capDays     = ref(22)
const capUtil     = ref(75)
const capSaving   = ref(false)

// Global settings fields (correct API names)
const genCurrency = ref('EGP')
const genVat      = ref(0)
const genProfit   = ref(40)
const genRounding = ref(5)
const genSaving   = ref(false)

const currencies = ['EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'USD']

// Add row form state
const addingTo = ref(null)
const newRow   = ref({ category: '', monthly_amount: 0, included: 1, notes: '',
                        role_name: '', monthly_salary: 0,
                        asset_name: '', purchase_cost: 0, life_years: 7, allocation_type: 'fixed', monthly_usage_hours: '' })

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }

function startAdd(section) {
  addingTo.value = section
  newRow.value = { category: '', monthly_amount: 0, included: 1, notes: '',
                   role_name: '', monthly_salary: 0,
                   asset_name: '', purchase_cost: 0, life_years: 7, allocation_type: 'fixed', monthly_usage_hours: '' }
}

async function saveAdd() {
  try {
    if (addingTo.value === 'costs') {
      await clinicStore.createFixedCost({
        category:       newRow.value.category || 'misc',
        monthly_amount: newRow.value.monthly_amount,
        included:       newRow.value.included,
        notes:          newRow.value.notes,
      })
      costRows.value = clinicStore.fixedCosts
    } else if (addingTo.value === 'salaries') {
      await clinicStore.createSalary({
        role_name:      newRow.value.role_name,
        monthly_salary: newRow.value.monthly_salary,
        included:       newRow.value.included,
        notes:          newRow.value.notes,
      })
      salaryRows.value = clinicStore.salaries
    } else if (addingTo.value === 'equipment') {
      const eq = {
        asset_name:      newRow.value.asset_name,
        purchase_cost:   newRow.value.purchase_cost,
        life_years:      newRow.value.life_years,
        allocation_type: newRow.value.allocation_type,
      }
      if (newRow.value.allocation_type === 'per-hour' && newRow.value.monthly_usage_hours !== '') {
        eq.monthly_usage_hours = parseFloat(newRow.value.monthly_usage_hours) || 0
      }
      await clinicStore.createEquipment(eq)
      equipRows.value = clinicStore.equipment
    }
    addingTo.value = null
  } catch (e) { console.error(e) }
}

async function updateFixedCost(row) {
  try {
    await clinicStore.updateFixedCost(row.id, {
      category:       row.category,
      monthly_amount: row.monthly_amount,
      included:       row.included ?? 1,
      notes:          row.notes || '',
    })
  } catch (e) { console.error(e) }
}

async function updateSalary(row) {
  try {
    await clinicStore.updateSalary(row.id, {
      role_name:      row.role_name,
      monthly_salary: row.monthly_salary,
      included:       row.included ?? 1,
      notes:          row.notes || '',
    })
  } catch (e) { console.error(e) }
}

async function updateEquipment(row) {
  const payload = {
    asset_name:      row.asset_name,
    purchase_cost:   row.purchase_cost,
    life_years:      row.life_years,
    allocation_type: row.allocation_type,
  }
  if (row.allocation_type === 'per-hour') payload.monthly_usage_hours = row.monthly_usage_hours || 0
  try { await clinicStore.updateEquipment(row.id, payload) }
  catch (e) { console.error(e) }
}

async function deleteRow(section, id) {
  try {
    if (section === 'costs')     await clinicStore.deleteFixedCost(id)
    if (section === 'salaries')  await clinicStore.deleteSalary(id)
    if (section === 'equipment') await clinicStore.deleteEquipment(id)
    await loadData()
  } catch (e) { console.error(e) }
}

async function saveCapacity() {
  capSaving.value = true
  try {
    await clinicStore.updateCapacity({
      chairs:              capChairs.value,
      hours_per_day:       capHours.value,
      days_per_month:      capDays.value,
      utilization_percent: capUtil.value,
    })
  } catch (e) { console.error(e) }
  capSaving.value = false
}

async function saveGlobalSettings() {
  genSaving.value = true
  try {
    await api.put('/api/settings/global', {
      currency:               genCurrency.value,
      vat_percent:            genVat.value,
      default_profit_percent: genProfit.value,
      rounding_nearest:       genRounding.value,
    })
  } catch (e) { console.error(e) }
  genSaving.value = false
}

const totalMonthly = computed(() =>
  costRows.value.reduce((s, r)   => s + (r.monthly_amount || 0), 0) +
  salaryRows.value.reduce((s, r) => s + (r.monthly_salary || 0), 0) +
  equipRows.value.reduce((s, r)  => s + Math.round((r.purchase_cost || 0) / ((r.life_years || 7) * 12)), 0)
)

async function loadData() {
  await clinicStore.loadAll().catch(() => {})
  costRows.value   = [...(clinicStore.fixedCosts || [])]
  salaryRows.value = [...(clinicStore.salaries   || [])]
  equipRows.value  = [...(clinicStore.equipment  || [])]
  if (clinicStore.capacity) {
    capChairs.value = clinicStore.capacity.chairs              || 2
    capHours.value  = clinicStore.capacity.hours_per_day       || 8
    capDays.value   = clinicStore.capacity.days_per_month      || 22
    capUtil.value   = clinicStore.capacity.utilization_percent || 75
  }
  try {
    const { data } = await api.get('/api/settings/global')
    if (data.currency)               genCurrency.value = data.currency
    if (data.vat_percent != null)    genVat.value      = data.vat_percent
    if (data.default_profit_percent != null) genProfit.value = data.default_profit_percent
    if (data.rounding_nearest != null)       genRounding.value = data.rounding_nearest
  } catch {}
}

onMounted(loadData)
</script>

<template>
  <AppShell active-key="settings">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="dpc-h page-title">{{ isAr ? 'الإعدادات' : 'Settings' }}</h1>
        <p class="page-sub">{{ isAr ? 'أي تغيير هنا يُعيد حساب أسعارك تلقائياً.' : 'Any change here recalculates your prices automatically.' }}</p>
      </div>
      <LangSwitch />
    </div>

    <div class="settings-body">
      <div class="settings-grid">
        <!-- Left nav -->
        <nav class="settings-nav">
          <div
            v-for="tab in tabs" :key="tab.id"
            :class="['nav-item', activeTab === tab.id && 'nav-item-active']"
            @click="activeTab = tab.id"
          >
            <DpcIcon :name="tab.icon" :size="16" :stroke-width="1.6" />
            {{ tab.label }}
          </div>
        </nav>

        <!-- Content -->
        <div class="settings-content">
          <!-- Fixed costs tab -->
          <template v-if="activeTab === 'costs'">
            <div class="tab-header">
              <div class="eyebrow-teal">{{ isAr ? 'التكاليف الثابتة' : 'Fixed costs' }}</div>
              <h2 class="dpc-h tab-title">{{ isAr ? 'ماذا تنفق كل شهر' : 'What you spend every month' }}</h2>
              <p class="tab-sub">{{ isAr ? 'تنقسم هذه إلى تكلفة ساعة الكرسي.' : 'These are spread across your chair-hours.' }}</p>
            </div>

            <!-- Stats row -->
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-label">{{ isAr ? 'إجمالي شهري' : 'Total / month' }}</div>
                <div class="dpc-num stat-value">{{ fmt(totalMonthly) }} <span class="stat-unit">{{ isAr ? 'ج.م' : 'EGP' }}</span></div>
              </div>
              <div class="stat-card stat-card-teal">
                <div class="stat-label-teal">{{ isAr ? 'آخر تعديل' : 'Last edited' }}</div>
                <div class="stat-value-teal">{{ isAr ? 'اليوم' : 'Today' }}</div>
              </div>
            </div>

            <div class="dpc-panel cost-table">
              <div class="cost-table-header">
                <span class="cost-section-title">{{ isAr ? 'التكاليف الثابتة' : 'Fixed costs' }}</span>
                <button class="add-link" @click="startAdd('costs')">
                  <DpcIcon name="Plus" :size="13" :stroke-width="2" />
                  {{ isAr ? 'أضف بنداً' : 'Add item' }}
                </button>
              </div>
              <div v-for="row in costRows" :key="row.id" class="cost-row cost-row-costs">
                <input v-model="row.category" class="cost-input cost-input-name" :placeholder="isAr ? 'الفئة' : 'Category'" @change="updateFixedCost(row)" />
                <input v-model.number="row.monthly_amount" type="number" class="cost-input" @change="updateFixedCost(row)" />
                <select v-model.number="row.included" class="cost-select" @change="updateFixedCost(row)">
                  <option :value="1">{{ isAr ? 'مُدرج' : 'Included' }}</option>
                  <option :value="0">{{ isAr ? 'مستبعد' : 'Excluded' }}</option>
                </select>
                <input v-model="row.notes" class="cost-input cost-input-notes" :placeholder="isAr ? 'ملاحظات' : 'Notes'" @change="updateFixedCost(row)" />
                <button class="icon-btn" @click="deleteRow('costs', row.id)">
                  <DpcIcon name="Trash2" :size="14" :stroke-width="1.7" />
                </button>
              </div>
              <div v-if="addingTo === 'costs'" class="add-form">
                <input v-model="newRow.category" :placeholder="isAr ? 'الفئة' : 'Category'" class="add-input" />
                <input v-model.number="newRow.monthly_amount" type="number" :placeholder="isAr ? 'المبلغ/شهر' : 'Amount/month'" class="add-input add-input-short" />
                <select v-model.number="newRow.included" class="add-input" style="width:110px;">
                  <option :value="1">{{ isAr ? 'مُدرج' : 'Included' }}</option>
                  <option :value="0">{{ isAr ? 'مستبعد' : 'Excluded' }}</option>
                </select>
                <input v-model="newRow.notes" :placeholder="isAr ? 'ملاحظات' : 'Notes (optional)'" class="add-input" />
                <button class="dpc-btn dpc-btn-teal add-btn" @click="saveAdd">{{ isAr ? 'حفظ' : 'Save' }}</button>
                <button class="dpc-btn dpc-btn-ghost" @click="addingTo = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
              </div>
            </div>
          </template>

          <!-- Salaries tab -->
          <template v-else-if="activeTab === 'salaries'">
            <div class="tab-header">
              <div class="eyebrow-teal">{{ isAr ? 'الرواتب' : 'Salaries' }}</div>
              <h2 class="dpc-h tab-title">{{ isAr ? 'رواتب الفريق الشهرية' : 'Monthly team salaries' }}</h2>
            </div>
            <div class="dpc-panel cost-table">
              <div class="cost-table-header">
                <span class="cost-section-title">{{ isAr ? 'الموظفون' : 'Team members' }}</span>
                <button class="add-link" @click="startAdd('salaries')">
                  <DpcIcon name="Plus" :size="13" :stroke-width="2" />
                  {{ isAr ? 'أضف موظفاً' : 'Add member' }}
                </button>
              </div>
              <div v-for="row in salaryRows" :key="row.id" class="cost-row cost-row-costs">
                <input v-model="row.role_name" class="cost-input cost-input-name" :placeholder="isAr ? 'المسمى الوظيفي' : 'Role name'" @change="updateSalary(row)" />
                <input v-model.number="row.monthly_salary" type="number" class="cost-input" @change="updateSalary(row)" />
                <select v-model.number="row.included" class="cost-select" @change="updateSalary(row)">
                  <option :value="1">{{ isAr ? 'مُدرج' : 'Included' }}</option>
                  <option :value="0">{{ isAr ? 'مستبعد' : 'Excluded' }}</option>
                </select>
                <input v-model="row.notes" class="cost-input cost-input-notes" :placeholder="isAr ? 'ملاحظات' : 'Notes'" @change="updateSalary(row)" />
                <button class="icon-btn" @click="deleteRow('salaries', row.id)">
                  <DpcIcon name="Trash2" :size="14" :stroke-width="1.7" />
                </button>
              </div>
              <div v-if="addingTo === 'salaries'" class="add-form">
                <input v-model="newRow.role_name" :placeholder="isAr ? 'المسمى الوظيفي' : 'Role title'" class="add-input" />
                <input v-model.number="newRow.monthly_salary" type="number" :placeholder="isAr ? 'الراتب الشهري' : 'Monthly salary'" class="add-input add-input-short" />
                <select v-model.number="newRow.included" class="add-input" style="width:110px;">
                  <option :value="1">{{ isAr ? 'مُدرج' : 'Included' }}</option>
                  <option :value="0">{{ isAr ? 'مستبعد' : 'Excluded' }}</option>
                </select>
                <input v-model="newRow.notes" :placeholder="isAr ? 'ملاحظات' : 'Notes (optional)'" class="add-input" />
                <button class="dpc-btn dpc-btn-teal add-btn" @click="saveAdd">{{ isAr ? 'حفظ' : 'Save' }}</button>
                <button class="dpc-btn dpc-btn-ghost" @click="addingTo = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
              </div>
            </div>
          </template>

          <!-- Equipment tab -->
          <template v-else-if="activeTab === 'equipment'">
            <div class="tab-header">
              <div class="eyebrow-teal">{{ isAr ? 'المعدات' : 'Equipment' }}</div>
              <h2 class="dpc-h tab-title">{{ isAr ? 'قائمة الأصول والإهلاك' : 'Assets & depreciation' }}</h2>
            </div>
            <div class="dpc-panel cost-table">
              <div class="cost-table-header">
                <span class="cost-section-title">{{ isAr ? 'قائمة المعدات' : 'Equipment list' }}</span>
                <button class="add-link" @click="startAdd('equipment')">
                  <DpcIcon name="Plus" :size="13" :stroke-width="2" />
                  {{ isAr ? 'أضف معدة' : 'Add equipment' }}
                </button>
              </div>
              <div v-for="row in equipRows" :key="row.id" class="cost-row equip-row">
                <input v-model="row.asset_name" class="cost-input cost-input-name" :placeholder="isAr ? 'اسم الأصل' : 'Asset name'" @change="updateEquipment(row)" />
                <input v-model.number="row.purchase_cost" type="number" class="cost-input" :placeholder="isAr ? 'تكلفة الشراء' : 'Purchase cost'" @change="updateEquipment(row)" />
                <input v-model.number="row.life_years" type="number" min="1" class="cost-input cost-input-short" :placeholder="isAr ? 'العمر (سنة)' : 'Life (yrs)'" @change="updateEquipment(row)" />
                <select v-model="row.allocation_type" class="cost-select" @change="updateEquipment(row)">
                  <option value="fixed">{{ isAr ? 'ثابت' : 'fixed' }}</option>
                  <option value="per-hour">{{ isAr ? 'بالساعة' : 'per-hour' }}</option>
                </select>
                <input
                  v-if="row.allocation_type === 'per-hour'"
                  v-model.number="row.monthly_usage_hours" type="number" step="0.5"
                  class="cost-input cost-input-short"
                  :placeholder="isAr ? 'سا/شهر' : 'hrs/mo'"
                  @change="updateEquipment(row)"
                />
                <span v-else class="cost-badge">{{ isAr ? 'إهلاك/شهر:' : 'depr/mo:' }} {{ fmt(Math.round((row.purchase_cost || 0) / ((row.life_years || 7) * 12))) }}</span>
                <button class="icon-btn" @click="deleteRow('equipment', row.id)">
                  <DpcIcon name="Trash2" :size="14" :stroke-width="1.7" />
                </button>
              </div>
              <div v-if="addingTo === 'equipment'" class="add-form equip-add-form">
                <input v-model="newRow.asset_name" :placeholder="isAr ? 'اسم الأصل' : 'Asset name'" class="add-input" />
                <input v-model.number="newRow.purchase_cost" type="number" :placeholder="isAr ? 'تكلفة الشراء' : 'Purchase cost'" class="add-input add-input-short" />
                <input v-model.number="newRow.life_years" type="number" :placeholder="isAr ? 'العمر (سنة)' : 'Life (yrs)'" class="add-input" style="width:80px;" />
                <select v-model="newRow.allocation_type" class="add-input" style="width:110px;">
                  <option value="fixed">{{ isAr ? 'ثابت' : 'fixed' }}</option>
                  <option value="per-hour">{{ isAr ? 'بالساعة' : 'per-hour' }}</option>
                </select>
                <input
                  v-if="newRow.allocation_type === 'per-hour'"
                  v-model="newRow.monthly_usage_hours" type="number" step="0.5"
                  :placeholder="isAr ? 'ساعات/شهر' : 'hrs/month'"
                  class="add-input" style="width:110px;"
                />
                <button class="dpc-btn dpc-btn-teal add-btn" @click="saveAdd">{{ isAr ? 'حفظ' : 'Save' }}</button>
                <button class="dpc-btn dpc-btn-ghost" @click="addingTo = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
              </div>
            </div>
          </template>

          <!-- Capacity tab -->
          <template v-else-if="activeTab === 'capacity'">
            <div class="tab-header">
              <div class="eyebrow-teal">{{ isAr ? 'طاقة العيادة' : 'Clinic capacity' }}</div>
              <h2 class="dpc-h tab-title">{{ isAr ? 'ساعات العمل وعدد الكراسي' : 'Working hours & chairs' }}</h2>
              <p class="tab-sub">{{ isAr ? 'تحدد تكلفة ساعة الكرسي.' : 'Drives your chair-hour cost calculation.' }}</p>
            </div>
            <div class="dpc-panel general-panel">
              <div class="gen-row">
                <label class="gen-label"><DpcIcon name="Armchair" :size="14" :stroke-width="1.6" /> {{ isAr ? 'عدد الكراسي' : 'Chairs' }}</label>
                <input v-model.number="capChairs" type="number" min="1" max="20" class="gen-input" />
              </div>
              <div class="gen-row">
                <label class="gen-label"><DpcIcon name="Clock" :size="14" :stroke-width="1.6" /> {{ isAr ? 'ساعات/يوم' : 'Hours / day' }}</label>
                <input v-model.number="capHours" type="number" min="1" max="24" step="0.5" class="gen-input" />
              </div>
              <div class="gen-row">
                <label class="gen-label"><DpcIcon name="Calendar" :size="14" :stroke-width="1.6" /> {{ isAr ? 'أيام/شهر' : 'Days / month' }}</label>
                <input v-model.number="capDays" type="number" min="1" max="31" class="gen-input" />
              </div>
              <div class="gen-row">
                <label class="gen-label"><DpcIcon name="TrendingUp" :size="14" :stroke-width="1.6" /> {{ isAr ? 'معدل الإشغال %' : 'Utilization %' }}</label>
                <input v-model.number="capUtil" type="number" min="0" max="100" class="gen-input" />
              </div>
              <div class="gen-summary">
                {{ isAr ? 'ساعات قابلة للفوترة/شهر:' : 'Billable hours/month:' }}
                <strong class="dpc-num">{{ Math.round(capChairs * capHours * capDays * (capUtil / 100)) }}</strong>
              </div>
              <button class="dpc-btn dpc-btn-teal save-inline-btn" :disabled="capSaving" @click="saveCapacity">
                {{ capSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الطاقة' : 'Save capacity') }}
              </button>
            </div>
          </template>

          <!-- General tab -->
          <template v-else-if="activeTab === 'general'">
            <div class="tab-header">
              <div class="eyebrow-teal">{{ isAr ? 'الإعدادات العامة' : 'General settings' }}</div>
              <h2 class="dpc-h tab-title">{{ isAr ? 'العملة والضريبة والربح' : 'Currency, VAT & profit' }}</h2>
            </div>
            <div class="dpc-panel general-panel">
              <div class="gen-row">
                <label class="gen-label">{{ isAr ? 'العملة' : 'Currency' }}</label>
                <select v-model="genCurrency" class="gen-select">
                  <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="gen-row">
                <label class="gen-label">{{ isAr ? 'ضريبة القيمة المضافة %' : 'VAT %' }}</label>
                <input v-model.number="genVat" type="number" min="0" max="100" step="0.5" class="gen-input" />
              </div>
              <div class="gen-row">
                <label class="gen-label">{{ isAr ? 'هامش الربح الافتراضي %' : 'Default profit %' }}</label>
                <input v-model.number="genProfit" type="number" min="0" max="500" class="gen-input" />
              </div>
              <div class="gen-row">
                <label class="gen-label">{{ isAr ? 'تقريب السعر' : 'Price rounding' }}</label>
                <select v-model.number="genRounding" class="gen-select">
                  <option v-for="r in [1,5,10,25,50,100]" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
              <div class="gen-row">
                <label class="gen-label">{{ isAr ? 'اللغة' : 'Language' }}</label>
                <div class="lang-toggle">
                  <span :class="['lang-opt', i18n.locale === 'en' && 'lang-opt-active']" @click="i18n.loadTranslations('en')">English</span>
                  <span :class="['lang-opt', i18n.locale === 'ar' && 'lang-opt-active']" @click="i18n.loadTranslations('ar')">العربية</span>
                </div>
              </div>
              <button class="dpc-btn dpc-btn-teal save-inline-btn" :disabled="genSaving" @click="saveGlobalSettings">
                {{ genSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الإعدادات' : 'Save settings') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.page-header {
  padding: 22px 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  background: var(--paper); border-bottom: 1px solid var(--line);
}
.page-title { font-size: 24px; margin-bottom: 4px; }
.page-sub   { color: var(--ink-500); font-size: 13.5px; margin: 0; max-width: 720px; }

.settings-body { padding: 20px 28px; }
.settings-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
  align-items: start;
}

.settings-nav {
  display: flex; flex-direction: column; gap: 2px;
  padding-inline-end: 16px;
  border-inline-end: 1px solid var(--line);
}

.nav-item {
  padding: 10px 12px; border-radius: 8px;
  display: flex; align-items: center; gap: 10px;
  font-size: 13.5px; font-weight: 500; color: var(--ink-600);
  cursor: pointer; transition: background .12s, color .12s;
}
.nav-item:hover:not(.nav-item-active) { background: var(--paper-2); }
.nav-item-active {
  background: var(--paper-2); color: var(--ink-900); font-weight: 600;
  box-shadow: inset 0 0 0 1px var(--line);
}

.settings-content { padding-inline-start: 28px; }

.tab-header { margin-bottom: 18px; }
.eyebrow-teal { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal-700); margin-bottom: 4px; }
.tab-title { font-size: 22px; margin-bottom: 4px; }
.tab-sub   { color: var(--ink-500); font-size: 13px; }

/* Stats */
.stat-grid  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px; }
.stat-card  { padding: 14px; border-radius: 12px; background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line); }
.stat-card-teal { background: var(--teal-50); box-shadow: inset 0 0 0 1px var(--teal-100); }
.stat-label { font-size: 11px; color: var(--ink-500); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px; }
.stat-value { font-size: 19px; font-weight: 600; color: var(--ink-900); }
.stat-unit  { font-size: 11.5px; color: var(--ink-500); }
.stat-label-teal { font-size: 11px; color: var(--teal-700); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px; }
.stat-value-teal { font-size: 19px; font-weight: 600; color: var(--teal-800); }

/* Cost table */
.cost-table { margin-bottom: 14px; overflow: hidden; }
.cost-table-header {
  padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
  background: var(--paper-2); border-bottom: 1px solid var(--line-2, #eee);
}
.cost-section-title { font-size: 13.5px; font-weight: 600; color: var(--ink-800); }
.add-link {
  font-size: 12px; color: var(--teal-700); font-weight: 500;
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
}

.cost-row {
  display: grid;
  grid-template-columns: 1fr 100px 160px 40px;
  gap: 14px;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line-2, #eee);
}
.cost-row:last-child { border-bottom: none; }
.cost-row-name { font-size: 13.5px; font-weight: 500; color: var(--ink-900); }
.cost-row-meta { font-size: 11.5px; color: var(--ink-500); margin-top: 2px; }
.cost-badge    { font-size: 11.5px; color: var(--ink-500); text-align: end; }
.cost-input {
  height: 38px; padding: 0 12px; border-radius: 8px;
  background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line-2, #eee);
  font-family: var(--font-mono); font-size: 13.5px; font-weight: 500; color: var(--ink-900);
  direction: ltr; text-align: end; border: none; outline: none;
}
.cost-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }

.icon-btn { width: 32px; height: 32px; border-radius: 8px; color: var(--ink-500); display: grid; place-items: center; }
.icon-btn:hover { background: var(--paper-2); }

/* Add form */
.add-form {
  display: flex; gap: 8px; padding: 12px 20px;
  background: var(--teal-50); border-top: 1px dashed var(--teal-200, #99f6e4);
  align-items: center;
}
.add-input {
  height: 36px; padding: 0 10px; flex: 1;
  border-radius: 8px; background: #fff; box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px; border: none; outline: none;
}
.add-input-short { flex: 0 0 110px; }
.add-btn { height: 36px; }

/* General settings */
.general-panel { padding: 22px; display: flex; flex-direction: column; gap: 20px; }
.gen-row { display: flex; align-items: center; gap: 24px; }
.gen-label { font-size: 13.5px; font-weight: 500; color: var(--ink-700); min-width: 100px; }
.gen-select {
  height: 40px; padding: 0 12px; min-width: 240px;
  border-radius: 8px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 14px; border: none; outline: none;
}
.lang-toggle {
  display: inline-flex; border-radius: 10px;
  background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); padding: 3px;
}
.lang-opt {
  padding: 6px 18px; border-radius: 7px; font-size: 13.5px;
  cursor: pointer; user-select: none; color: var(--ink-600);
}
.lang-opt-active { background: var(--ink-900); color: #fff; font-weight: 600; }

/* Save bar */
.save-bar {
  position: sticky; bottom: 16px; margin-top: 24px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-radius: 14px;
  background: var(--ink-900); color: #fff;
  box-shadow: 0 8px 32px rgba(15,37,69,.24);
}
.save-bar-info { display: flex; align-items: center; gap: 12px; }
.save-icon {
  width: 30px; height: 30px; border-radius: 8px; flex: none;
  background: rgba(94,224,185,.15); color: #5ee0b9; display: grid; place-items: center;
}
.save-bar-title { font-weight: 600; font-size: 13px; }
.save-bar-sub   { color: rgba(255,255,255,.6); font-size: 13px; }
.save-bar-actions { display: flex; gap: 8px; }
.save-bar-discard { color: rgba(255,255,255,.7); height: 36px; }

.cost-input-name  { font-family: inherit; }
.cost-input-notes { font-family: inherit; font-size: 12.5px; }
.cost-input-short { width: 80px; flex: none; }
.cost-select {
  height: 38px; padding: 0 8px; border-radius: 8px;
  background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line-2, #eee);
  font-size: 12.5px; color: var(--ink-700); border: none; outline: none;
}
.cost-select:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }
.cost-row-costs { grid-template-columns: minmax(0,1.5fr) 140px 110px minmax(0,1fr) 40px; }
.equip-row { grid-template-columns: minmax(0,1.5fr) 140px 80px 110px 1fr 40px; }
.equip-add-form { flex-wrap: wrap; }

.gen-input {
  height: 40px; padding: 0 12px; min-width: 140px;
  border-radius: 8px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 14px; border: none; outline: none;
}
.gen-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }

.gen-summary {
  font-size: 13.5px; color: var(--ink-600);
  padding: 10px 0 4px; border-top: 1px solid var(--line);
}
.gen-summary strong { color: var(--teal-700); margin-inline-start: 4px; }

.save-inline-btn { height: 40px; margin-top: 8px; align-self: flex-start; }
</style>
