<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useClinicStore } from '@/stores/clinic.js'
import { useI18nStore } from '@/stores/i18n.js'

const clinicStore = useClinicStore()
const i18n        = useI18nStore()

const isAr       = computed(() => i18n.locale === 'ar')
const activeTab  = ref('consumables') // 'consumables' | 'materials'
const selectedItem  = ref(null)
const showAddModal  = ref(false)
const confirmDelete = ref(null)

// Edit form — fields shared between consumable/material editing
const editForm = ref({
  item_name: '', name_ar: '',
  pack_cost: 0, cases_per_pack: 1, units_per_case: 1,
  material_name: '', lab_name: '', unit_cost: 0,
})

// Add form
const newItem = ref({
  item_name: '', name_ar: '',
  pack_cost: 0, cases_per_pack: 1, units_per_case: 1,
  material_name: '', lab_name: '', unit_cost: 0,
})

function fmt(n)  { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) }
function fmtInt(n){ return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }

function perUnit(item) {
  const denom = (item.cases_per_pack || 1) * (item.units_per_case || 1)
  return denom > 0 ? (item.pack_cost || 0) / denom : 0
}

function itemName(item) {
  if (item._type === 'material') {
    return isAr.value ? (item.name_ar || item.material_name || '') : (item.material_name || item.name_ar || '')
  }
  return isAr.value ? (item.name_ar || item.item_name || '') : (item.item_name || item.name_ar || '')
}

function selectItem(item) {
  selectedItem.value = item
  if (item._type === 'consumable') {
    editForm.value = {
      item_name:      item.item_name || '',
      name_ar:        item.name_ar || '',
      pack_cost:      item.pack_cost || 0,
      cases_per_pack: item.cases_per_pack || 1,
      units_per_case: item.units_per_case || 1,
      material_name: '', lab_name: '', unit_cost: 0,
    }
  } else {
    editForm.value = {
      item_name: '', name_ar: item.name_ar || '',
      pack_cost: 0, cases_per_pack: 1, units_per_case: 1,
      material_name: item.material_name || '',
      lab_name:      item.lab_name || '',
      unit_cost:     item.unit_cost || 0,
    }
  }
}

async function saveEdit() {
  if (!selectedItem.value) return
  const id = selectedItem.value.id
  try {
    if (selectedItem.value._type === 'consumable') {
      await clinicStore.updateConsumable(id, {
        item_name:        editForm.value.item_name,
        name_ar:        editForm.value.name_ar,
        pack_cost:     editForm.value.pack_cost,
        cases_per_pack: editForm.value.cases_per_pack,
        units_per_case: editForm.value.units_per_case,
      })
    } else {
      await clinicStore.updateMaterial(id, {
        material_name: editForm.value.material_name,
        name_ar:       editForm.value.name_ar,
        lab_name:      editForm.value.lab_name,
        unit_cost:     editForm.value.unit_cost,
      })
    }
  } catch (e) { console.error(e) }
  selectedItem.value = null
}

async function deleteItem() {
  if (!confirmDelete.value) return
  try {
    if (confirmDelete.value._type === 'consumable') {
      await clinicStore.deleteConsumable(confirmDelete.value.id)
    } else {
      await clinicStore.deleteMaterial(confirmDelete.value.id)
    }
  } catch (e) { console.error(e) }
  confirmDelete.value = null
  selectedItem.value  = null
}

async function addNew() {
  try {
    if (activeTab.value === 'consumables') {
      await clinicStore.createConsumable({
        item_name:        newItem.value.item_name,
        name_ar:        newItem.value.name_ar,
        pack_cost:     newItem.value.pack_cost,
        cases_per_pack: newItem.value.cases_per_pack,
        units_per_case: newItem.value.units_per_case,
      })
    } else {
      await clinicStore.createMaterial({
        material_name: newItem.value.material_name,
        name_ar:       newItem.value.name_ar,
        lab_name:      newItem.value.lab_name,
        unit_cost:     newItem.value.unit_cost,
      })
    }
    showAddModal.value = false
    newItem.value = { item_name: '', name_ar: '', pack_cost: 0, cases_per_pack: 1, units_per_case: 1, material_name: '', lab_name: '', unit_cost: 0 }
  } catch (e) { console.error(e) }
}

function openAdd() {
  newItem.value = { item_name: '', name_ar: '', pack_cost: 0, cases_per_pack: 1, units_per_case: 1, material_name: '', lab_name: '', unit_cost: 0 }
  showAddModal.value = true
  selectedItem.value = null
}

const consumables = computed(() => (clinicStore.consumables || []).map(x => ({ ...x, _type: 'consumable' })))
const materials   = computed(() => (clinicStore.materials   || []).map(x => ({ ...x, _type: 'material'   })))
const displayItems = computed(() => activeTab.value === 'consumables' ? consumables.value : materials.value)

const computedPerUnit = computed(() => {
  if (!selectedItem.value || selectedItem.value._type !== 'consumable') return 0
  const denom = (editForm.value.cases_per_pack || 1) * (editForm.value.units_per_case || 1)
  return denom > 0 ? editForm.value.pack_cost / denom : 0
})

onMounted(async () => {
  await clinicStore.loadAll().catch(() => {})
})
</script>

<template>
  <AppShell active-key="consumables">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="dpc-h page-title">{{ isAr ? 'المستهلكات والخامات' : 'Consumables & materials' }}</h1>
        <p class="page-sub">{{ isAr
          ? 'تكلفة كل وحدة محسوبة من سعر الباكيت ÷ الحالات ÷ الوحدات.'
          : 'Per-unit cost is computed from pack price ÷ cases ÷ units.' }}</p>
      </div>
      <div class="header-actions">
        <button class="dpc-btn dpc-btn-teal btn-sm" @click="openAdd">
          <DpcIcon name="Plus" :size="13" :stroke-width="2" />
          {{ activeTab === 'consumables' ? (isAr ? 'مستهلك جديد' : 'New consumable') : (isAr ? 'خامة جديدة' : 'New material') }}
        </button>
        <LangSwitch />
      </div>
    </div>

    <div class="con-body">
      <!-- Tab switcher -->
      <div class="tab-bar">
        <button
          :class="['tab-btn', activeTab === 'consumables' && 'tab-btn-active']"
          @click="activeTab = 'consumables'; selectedItem = null"
        >
          <DpcIcon name="Package" :size="14" :stroke-width="1.7" />
          {{ isAr ? 'المستهلكات' : 'Consumables' }}
          <span class="tab-count">{{ consumables.length }}</span>
        </button>
        <button
          :class="['tab-btn', activeTab === 'materials' && 'tab-btn-active']"
          @click="activeTab = 'materials'; selectedItem = null"
        >
          <DpcIcon name="FlaskConical" :size="14" :stroke-width="1.7" />
          {{ isAr ? 'خامات المختبر' : 'Lab materials' }}
          <span class="tab-count">{{ materials.length }}</span>
        </button>
      </div>

      <div class="grid-layout">
        <!-- Table -->
        <div class="dpc-panel table-wrap">

          <!-- Consumables table -->
          <template v-if="activeTab === 'consumables'">
            <div class="table-head con-head">
              <div>{{ isAr ? 'الخامة' : 'Item' }}</div>
              <div class="col-end">{{ isAr ? 'سعر الباكيت' : 'Pack cost' }}</div>
              <div class="col-center">{{ isAr ? 'حالات' : 'Cases' }}</div>
              <div class="col-center">{{ isAr ? 'وحدات' : 'Units' }}</div>
              <div class="col-end">{{ isAr ? 'تكلفة الوحدة' : 'Per unit' }}</div>
              <div></div>
            </div>

            <div
              v-for="(item, i) in displayItems" :key="item.id"
              :class="['table-row con-row', i < displayItems.length - 1 && 'row-border', selectedItem?.id === item.id && 'row-selected']"
              @click="selectItem(item)"
            >
              <div class="item-cell">
                <div class="item-icon" :class="selectedItem?.id === item.id && 'item-icon-teal'">
                  <DpcIcon name="Package" :size="14" :stroke-width="1.7" />
                </div>
                <div>
                  <div class="item-name">{{ itemName(item) }}</div>
                  <div class="item-sku">{{ item.sku || `CON-${item.id}` }}</div>
                </div>
              </div>
              <div class="dpc-num col-end t-sm">{{ fmtInt(item.pack_cost || 0) }}</div>
              <div class="dpc-num col-center t-sm text-faint">{{ item.cases_per_pack || item.cases || 1 }}</div>
              <div class="dpc-num col-center t-sm text-faint">{{ item.units_per_case || item.units || 1 }}</div>
              <div class="dpc-num col-end t-bold">{{ fmt(perUnit(item)) }}</div>
              <div class="col-end">
                <button class="icon-btn" @click.stop="confirmDelete = item">
                  <DpcIcon name="Trash2" :size="13" :stroke-width="1.7" />
                </button>
              </div>
            </div>
          </template>

          <!-- Materials table -->
          <template v-else>
            <div class="table-head mat-head">
              <div>{{ isAr ? 'الخامة' : 'Material' }}</div>
              <div>{{ isAr ? 'المختبر' : 'Lab' }}</div>
              <div class="col-end">{{ isAr ? 'تكلفة الوحدة' : 'Unit cost' }}</div>
              <div></div>
            </div>

            <div
              v-for="(item, i) in displayItems" :key="item.id"
              :class="['table-row mat-row', i < displayItems.length - 1 && 'row-border', selectedItem?.id === item.id && 'row-selected']"
              @click="selectItem(item)"
            >
              <div class="item-cell">
                <div class="item-icon" :class="selectedItem?.id === item.id && 'item-icon-teal'">
                  <DpcIcon name="FlaskConical" :size="14" :stroke-width="1.7" />
                </div>
                <div>
                  <div class="item-name">{{ itemName(item) }}</div>
                  <div v-if="item.name_ar && isAr === false" class="item-sku">{{ item.name_ar }}</div>
                </div>
              </div>
              <div class="t-sm text-faint">{{ item.lab_name || '—' }}</div>
              <div class="dpc-num col-end t-bold">{{ fmt(item.unit_cost || 0) }}</div>
              <div class="col-end">
                <button class="icon-btn" @click.stop="confirmDelete = item">
                  <DpcIcon name="Trash2" :size="13" :stroke-width="1.7" />
                </button>
              </div>
            </div>
          </template>

          <!-- Empty state -->
          <div v-if="displayItems.length === 0" class="empty-state">
            <DpcIcon :name="activeTab === 'consumables' ? 'Package' : 'FlaskConical'" :size="28" :stroke-width="1.3" class="empty-icon" />
            <p>{{ activeTab === 'consumables'
              ? (isAr ? 'لم تُضف أي مستهلكات بعد.' : 'No consumables added yet.')
              : (isAr ? 'لم تُضف أي خامات بعد.' : 'No lab materials added yet.') }}</p>
            <button class="dpc-btn dpc-btn-teal" style="height:36px;" @click="openAdd">
              <DpcIcon name="Plus" :size="13" :stroke-width="2" />
              {{ activeTab === 'consumables' ? (isAr ? 'أضف مستهلكاً' : 'Add consumable') : (isAr ? 'أضف خامة' : 'Add material') }}
            </button>
          </div>
        </div>

        <!-- Edit panel -->
        <div class="dpc-panel edit-panel">
          <div class="edit-header">
            <div class="mini-eyebrow">{{ isAr ? 'تعديل' : 'Edit' }}</div>
            <button v-if="selectedItem" class="icon-btn" @click="selectedItem = null">
              <DpcIcon name="X" :size="16" :stroke-width="1.7" />
            </button>
          </div>

          <div v-if="!selectedItem" class="edit-empty">
            <DpcIcon name="Package" :size="32" :stroke-width="1.4" class="empty-icon-sm" />
            <p>{{ isAr ? 'اختر عنصراً للتعديل' : 'Select an item to edit' }}</p>
          </div>

          <template v-else>
            <div class="selected-chip">
              <div class="selected-icon">
                <DpcIcon :name="selectedItem._type === 'consumable' ? 'Package' : 'FlaskConical'" :size="18" :stroke-width="1.7" />
              </div>
              <div>
                <div class="selected-name">{{ itemName(selectedItem) }}</div>
                <div class="selected-sku">{{ selectedItem._type === 'consumable' ? (selectedItem.sku || `CON-${selectedItem.id}`) : `MAT-${selectedItem.id}` }}</div>
              </div>
            </div>

            <!-- Consumable fields -->
            <template v-if="selectedItem._type === 'consumable'">
              <div class="edit-fields">
                <div>
                  <label class="field-label">{{ isAr ? 'الاسم (EN)' : 'Name (EN)' }}</label>
                  <input v-model="editForm.item_name" class="edit-input" />
                </div>
                <div>
                  <label class="field-label">{{ isAr ? 'الاسم (AR)' : 'Name (AR)' }}</label>
                  <input v-model="editForm.name_ar" class="edit-input" dir="rtl" />
                </div>
                <div>
                  <label class="field-label">{{ isAr ? 'سعر الباكيت' : 'Pack cost' }}</label>
                  <div class="input-with-suffix">
                    <input v-model.number="editForm.pack_cost" type="number" class="edit-input" />
                    <span class="input-suffix">{{ isAr ? 'ج.م' : 'EGP' }}</span>
                  </div>
                </div>
                <div class="two-col">
                  <div>
                    <label class="field-label">{{ isAr ? 'حالات / باكيت' : 'Cases / pack' }}</label>
                    <input v-model.number="editForm.cases_per_pack" type="number" class="edit-input" />
                  </div>
                  <div>
                    <label class="field-label">{{ isAr ? 'وحدات / حالة' : 'Units / case' }}</label>
                    <input v-model.number="editForm.units_per_case" type="number" class="edit-input" />
                  </div>
                </div>
                <div class="computed-box">
                  <div class="computed-label">{{ isAr ? 'تكلفة الوحدة المحسوبة' : 'Computed per-unit cost' }}</div>
                  <div class="dpc-num computed-value">{{ fmt(computedPerUnit) }} <span class="computed-unit">{{ isAr ? 'ج.م' : 'EGP' }}</span></div>
                </div>
              </div>
            </template>

            <!-- Material fields -->
            <template v-else>
              <div class="edit-fields">
                <div>
                  <label class="field-label">{{ isAr ? 'اسم الخامة (EN)' : 'Material name (EN)' }}</label>
                  <input v-model="editForm.material_name" class="edit-input" />
                </div>
                <div>
                  <label class="field-label">{{ isAr ? 'الاسم (AR)' : 'Name (AR)' }}</label>
                  <input v-model="editForm.name_ar" class="edit-input" dir="rtl" />
                </div>
                <div>
                  <label class="field-label">{{ isAr ? 'اسم المختبر' : 'Lab name' }}</label>
                  <input v-model="editForm.lab_name" class="edit-input" :placeholder="isAr ? 'اختياري' : 'Optional'" />
                </div>
                <div>
                  <label class="field-label">{{ isAr ? 'تكلفة الوحدة' : 'Unit cost' }}</label>
                  <div class="input-with-suffix">
                    <input v-model.number="editForm.unit_cost" type="number" class="edit-input" />
                    <span class="input-suffix">{{ isAr ? 'ج.م' : 'EGP' }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div class="edit-actions">
              <button class="dpc-btn dpc-btn-outline" @click="selectedItem = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
              <button class="dpc-btn dpc-btn-teal"    @click="saveEdit">{{ isAr ? 'حفظ' : 'Save' }}</button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Add modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="dpc-h modal-title">
            {{ activeTab === 'consumables' ? (isAr ? 'إضافة مستهلك' : 'Add consumable') : (isAr ? 'إضافة خامة' : 'Add material') }}
          </h2>
          <button class="icon-btn" @click="showAddModal = false"><DpcIcon name="X" :size="16" :stroke-width="2" /></button>
        </div>
        <div class="modal-body">
          <!-- Consumable fields -->
          <template v-if="activeTab === 'consumables'">
            <div class="form-group">
              <label class="field-label">{{ isAr ? 'الاسم *' : 'Name *' }}</label>
              <input v-model="newItem.item_name" class="edit-input" :placeholder="isAr ? 'مثال: قفازات لاتكس' : 'e.g., Latex Gloves'" />
            </div>
            <div class="form-group">
              <label class="field-label">{{ isAr ? 'الاسم بالعربية' : 'Name (Arabic)' }}</label>
              <input v-model="newItem.name_ar" class="edit-input" dir="rtl" :placeholder="isAr ? 'اسم المستهلك بالعربية' : 'Arabic name (optional)'" />
            </div>

            <!-- Packaging calculator -->
            <div class="pkg-calc">
              <div class="pkg-title">{{ isAr ? 'حاسبة التعبئة' : 'Packaging breakdown' }}</div>

              <div class="pkg-steps">
                <!-- Step 1 -->
                <div class="pkg-step">
                  <div class="pkg-step-num">1</div>
                  <div class="pkg-step-body">
                    <label class="field-label">{{ isAr ? 'سعر الباكيت *' : 'Pack cost *' }}</label>
                    <input v-model.number="newItem.pack_cost" type="number" step="0.01" class="edit-input" :placeholder="isAr ? 'مثال: 180' : 'e.g., 180'" />
                  </div>
                </div>
                <div class="pkg-arrow">↓</div>
                <!-- Step 2 -->
                <div class="pkg-step">
                  <div class="pkg-step-num">2</div>
                  <div class="pkg-step-body">
                    <label class="field-label">{{ isAr ? 'حالات / باكيت *' : 'Cases per pack *' }}</label>
                    <input v-model.number="newItem.cases_per_pack" type="number" min="1" class="edit-input" placeholder="e.g., 10" />
                  </div>
                </div>
                <div class="pkg-arrow">↓</div>
                <!-- Step 3 -->
                <div class="pkg-step">
                  <div class="pkg-step-num">3</div>
                  <div class="pkg-step-body">
                    <label class="field-label">{{ isAr ? 'وحدات / حالة *' : 'Units per case *' }}</label>
                    <input v-model.number="newItem.units_per_case" type="number" min="1" class="edit-input" placeholder="e.g., 100" />
                  </div>
                </div>
              </div>

              <!-- Live result -->
              <div class="pkg-result">
                <span class="pkg-eq-part">{{ newItem.pack_cost || 0 }}</span>
                <span class="pkg-eq-op">÷</span>
                <span class="pkg-eq-part">{{ (newItem.cases_per_pack || 1) * (newItem.units_per_case || 1) }} {{ isAr ? 'وحدة' : 'units' }}</span>
                <span class="pkg-eq-op">=</span>
                <span class="pkg-eq-result">
                  {{ ((newItem.pack_cost || 0) / ((newItem.cases_per_pack || 1) * (newItem.units_per_case || 1))).toFixed(3) }}
                  <small>{{ isAr ? 'ج.م / وحدة' : 'EGP / unit' }}</small>
                </span>
              </div>
            </div>
          </template>
          <!-- Material fields -->
          <template v-else>
            <div class="form-group">
              <label class="field-label">{{ isAr ? 'اسم الخامة *' : 'Material name *' }}</label>
              <input v-model="newItem.material_name" class="edit-input" :placeholder="isAr ? 'مثال: تاج زركونيا' : 'e.g., Zirconia Crown'" />
            </div>
            <div class="form-group">
              <label class="field-label">{{ isAr ? 'الاسم بالعربية' : 'Name (Arabic)' }}</label>
              <input v-model="newItem.name_ar" class="edit-input" dir="rtl" :placeholder="isAr ? 'اسم الخامة بالعربية' : 'Arabic name (optional)'" />
            </div>
            <div class="form-group">
              <label class="field-label">{{ isAr ? 'اسم المختبر' : 'Lab name' }}</label>
              <input v-model="newItem.lab_name" class="edit-input" :placeholder="isAr ? 'اختياري' : 'Optional'" />
            </div>
            <div class="form-group">
              <label class="field-label">{{ isAr ? 'تكلفة الوحدة *' : 'Unit cost *' }}</label>
              <input v-model.number="newItem.unit_cost" type="number" step="0.01" class="edit-input" :placeholder="isAr ? 'مثال: 500' : 'e.g., 500'" />
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="dpc-btn dpc-btn-ghost" @click="showAddModal = false">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button class="dpc-btn dpc-btn-teal" @click="addNew">{{ isAr ? 'إضافة' : 'Add' }}</button>
        </div>
      </div>
    </div>

    <!-- Confirm delete -->
    <div v-if="confirmDelete" class="modal-overlay" @click.self="confirmDelete = null">
      <div class="modal-box confirm-box">
        <div class="dpc-h modal-title" style="padding:20px 24px;">{{ isAr ? 'تأكيد الحذف' : 'Confirm delete' }}</div>
        <p class="confirm-text">{{ isAr ? 'هل تريد حذف هذا العنصر؟ لا يمكن التراجع.' : 'Delete this item? This cannot be undone.' }}</p>
        <div class="modal-footer">
          <button class="dpc-btn dpc-btn-ghost" @click="confirmDelete = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button class="dpc-btn" style="background:var(--danger-600);color:#fff;" @click="deleteItem">{{ isAr ? 'حذف' : 'Delete' }}</button>
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
.header-actions { display: flex; gap: 8px; align-items: center; }
.btn-sm { height: 36px; }

/* Tab bar */
.tab-bar {
  display: flex; gap: 4px; padding: 14px 28px 0;
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 10px 10px 0 0;
  font-size: 13px; font-weight: 500; color: var(--ink-500);
  background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  cursor: pointer; border: none; transition: all .12s;
}
.tab-btn:hover:not(.tab-btn-active) { background: var(--paper-2); color: var(--ink-700); }
.tab-btn-active { background: var(--paper); color: var(--ink-900); font-weight: 600; box-shadow: inset 0 0 0 1px var(--line); box-shadow: 0 -1px 0 0 var(--paper) inset, 0 0 0 1px var(--line) inset; }
.tab-count {
  font-family: var(--font-mono); font-size: 11px;
  padding: 1px 6px; border-radius: 99px;
  background: var(--paper-2); color: var(--ink-500);
}
.tab-btn-active .tab-count { background: var(--teal-50); color: var(--teal-700); }

.con-body { padding: 0 28px 28px; }

.grid-layout {
  display: grid; grid-template-columns: 1fr 360px; gap: 18px; align-items: start;
  padding-top: 18px;
}

/* Table */
.table-wrap { overflow: hidden; }

.table-head { background: var(--paper-2); border-bottom: 1px solid var(--line); padding: 10px 18px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-500); }
.con-head { display: grid; grid-template-columns: minmax(0,2fr) 100px 70px 70px 110px 40px; align-items: center; }
.mat-head { display: grid; grid-template-columns: minmax(0,2fr) 1fr 110px 40px; align-items: center; }

.table-row { cursor: pointer; }
.table-row:hover:not(.row-selected) { background: var(--paper-2); }
.con-row { display: grid; grid-template-columns: minmax(0,2fr) 100px 70px 70px 110px 40px; align-items: center; padding: 12px 18px; }
.mat-row { display: grid; grid-template-columns: minmax(0,2fr) 1fr 110px 40px; align-items: center; padding: 12px 18px; }
.row-border   { border-bottom: 1px solid var(--line-2, #f0eeea); }
.row-selected { background: var(--teal-50); }

.col-center { text-align: center; }
.col-end    { text-align: end; }

.item-cell { display: flex; align-items: center; gap: 12px; }
.item-icon {
  width: 30px; height: 30px; border-radius: 8px; flex: none;
  background: var(--paper-2); color: var(--ink-700);
  display: grid; place-items: center;
  box-shadow: inset 0 0 0 1px var(--line);
}
.item-icon-teal { background: var(--teal-100); color: var(--teal-700); }
.item-name { font-size: 13.5px; font-weight: 500; color: var(--ink-900); }
.item-sku  { font-size: 11px; color: var(--ink-500); }

.t-sm    { font-size: 13px; color: var(--ink-700); }
.t-bold  { font-weight: 600; color: var(--ink-900); }
.text-faint { color: var(--ink-500); }

.icon-btn { width: 28px; height: 28px; border-radius: 7px; color: var(--ink-400); display: grid; place-items: center; }
.icon-btn:hover { background: var(--danger-50); color: var(--danger-700); }

/* Empty state */
.empty-state {
  padding: 40px 24px; text-align: center; display: flex; flex-direction: column;
  align-items: center; gap: 12px; color: var(--ink-400);
}
.empty-icon { color: var(--ink-300); }

/* Edit panel */
.edit-panel { padding: 22px; position: sticky; top: 16px; }
.edit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.mini-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal-700); }
.edit-empty { text-align: center; padding: 32px 0; color: var(--ink-400); font-size: 13.5px; }
.empty-icon-sm { margin: 0 auto 12px; display: block; color: var(--ink-300); }

.selected-chip { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; padding: 12px; border-radius: 12px; background: var(--paper-2); }
.selected-icon { width: 40px; height: 40px; border-radius: 10px; flex: none; background: var(--surface); color: var(--ink-700); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--line); }
.selected-name { font-size: 14px; font-weight: 600; color: var(--ink-900); }
.selected-sku  { font-size: 11.5px; color: var(--ink-500); }

.edit-fields { display: flex; flex-direction: column; gap: 14px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--ink-700); display: block; margin-bottom: 4px; }
.edit-input {
  width: 100%; height: 40px; padding: 0 10px;
  border-radius: 8px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 14px; border: none; outline: none;
}
.edit-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.input-with-suffix { position: relative; }
.input-suffix { position: absolute; inset-inline-end: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--ink-400); pointer-events: none; }

.computed-box { padding: 14px; border-radius: 12px; background: var(--teal-50); box-shadow: inset 0 0 0 1px var(--teal-100); }
.computed-label { font-size: 11.5px; color: var(--teal-700); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px; }
.computed-value { font-size: 26px; font-weight: 600; color: var(--teal-800); }
.computed-unit  { font-size: 12px; color: var(--teal-700); font-family: var(--font-sans); }

.edit-actions { display: flex; gap: 8px; margin-top: 16px; }
.edit-actions .dpc-btn { flex: 1; height: 40px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; z-index: 100; }
.modal-box { background: var(--surface); border-radius: 16px; width: 460px; box-shadow: var(--shadow-lg, 0 20px 60px rgba(0,0,0,.12)); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.confirm-box { width: 380px; }
.modal-header { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); flex: none; }
.modal-title  { font-size: 18px; }
.modal-body   { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.modal-footer { padding: 16px 24px; display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--line); flex: none; }
.confirm-text { padding: 12px 24px; font-size: 14px; color: var(--ink-600); margin: 0; }
.form-group { display: flex; flex-direction: column; gap: 4px; }

/* Packaging calculator */
.pkg-calc { border-radius: 12px; background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.pkg-title { font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--teal-700); }
.pkg-steps { display: flex; flex-direction: column; gap: 4px; }
.pkg-step  { display: flex; align-items: flex-start; gap: 12px; }
.pkg-step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--teal-600); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700; flex: none; margin-top: 22px; }
.pkg-step-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.pkg-arrow { text-align: center; color: var(--ink-400); font-size: 18px; line-height: 1; }
.pkg-result {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 12px; border-radius: 10px;
  background: var(--teal-50); box-shadow: inset 0 0 0 1px var(--teal-100);
}
.pkg-eq-part   { font-size: 13.5px; font-weight: 600; color: var(--ink-700); font-family: var(--font-mono); }
.pkg-eq-op     { font-size: 16px; color: var(--ink-400); font-weight: 300; }
.pkg-eq-result { font-size: 16px; font-weight: 700; color: var(--teal-800); font-family: var(--font-mono); }
.pkg-eq-result small { font-family: var(--font-sans); font-size: 11px; color: var(--teal-600); font-weight: 400; margin-inline-start: 4px; }
</style>
