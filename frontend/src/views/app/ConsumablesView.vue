<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppShell from '@/components/AppShell.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import DpcTable from '@/components/table/DpcTable.vue'
import DpcTableHead from '@/components/table/DpcTableHead.vue'
import DpcTableRow from '@/components/table/DpcTableRow.vue'
import DpcTableCell from '@/components/table/DpcTableCell.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useClinicStore } from '@/stores/clinic.js'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const clinicStore = useClinicStore()
const i18n        = useI18nStore()
const currency    = ref('EGP')

const isAr       = computed(() => i18n.locale === 'ar')
const activeTab  = ref('consumables') // 'consumables' | 'materials'
// Default the desktop layout to table view, phones to grid view since
// the side-by-side table+edit-panel layout is unusable at phone widths.
const isPhone = ref(false)
const viewMode = ref('table')
function syncViewportMode() {
  if (typeof window === 'undefined') return
  isPhone.value = window.matchMedia('(max-width: 767px)').matches
  if (isPhone.value && viewMode.value === 'table') viewMode.value = 'grid'
}
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
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)
  await Promise.all([
    clinicStore.loadAll().catch(() => {}),
    axios.get('/api/settings/global', { withCredentials: true })
      .then(res => { currency.value = res.data.currency || 'EGP' })
      .catch(() => {}),
  ])
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewportMode)
})
</script>

<template>
  <AppShell active-key="consumables">
    <!-- Premium page header -->
    <PageHeader
      :title="isAr ? 'المستهلكات والخامات' : 'Consumables & materials'"
      :subtitle="isAr ? 'تكلفة كل وحدة محسوبة من سعر الباكيت ÷ العلب ÷ الوحدات.' : 'Per-unit cost is computed from pack price ÷ cases ÷ units.'"
      icon="Package"
    >
      <template #actions>
        <!-- View toggle -->
        <div class="view-toggle">
          <button
            :class="['view-btn', viewMode === 'table' && 'view-btn-active']"
            @click="viewMode = 'table'"
            :title="isAr ? 'عرض جدول' : 'Table view'"
          >
            <DpcIcon name="List" :size="16" :stroke-width="1.8" />
          </button>
          <button
            :class="['view-btn', viewMode === 'grid' && 'view-btn-active']"
            @click="viewMode = 'grid'"
            :title="isAr ? 'عرض شبكة' : 'Grid view'"
          >
            <DpcIcon name="LayoutGrid" :size="16" :stroke-width="1.8" />
          </button>
        </div>
        <DpcBtn variant="teal" size="sm" icon="Plus" @click="openAdd">
          {{ activeTab === 'consumables' ? (isAr ? 'مستهلك جديد' : 'New consumable') : (isAr ? 'خامة جديدة' : 'New material') }}
        </DpcBtn>
        <LangSwitch />
      </template>
    </PageHeader>

    <div class="con-body">
      <!-- Premium tab switcher -->
      <div class="tab-bar animate-fade-in-up" style="animation-delay: var(--stagger-1);">
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
          {{ isAr ? 'خامات المعمل' : 'Lab materials' }}
          <span class="tab-count">{{ materials.length }}</span>
        </button>
      </div>

      <!-- View pane + edit panel — single content host so edit
           remains available regardless of view mode and viewport. -->
      <div class="con-content" :class="{ 'con-content--has-edit': !!selectedItem }">

      <!-- Table view (desktop / tablet only) -->
      <div v-if="viewMode === 'table'" class="con-pane">
        <DpcTable
          :empty="displayItems.length === 0"
          :empty-icon="activeTab === 'consumables' ? 'Package' : 'FlaskConical'"
          :empty-message="activeTab === 'consumables'
            ? (isAr ? 'لم تُضف أي مستهلكات بعد.' : 'No consumables added yet.')
            : (isAr ? 'لم تُضف أي خامات بعد.' : 'No lab materials added yet.')"
          class="consumables-table animate-fade-in-up"
          style="animation-delay: var(--stagger-2);"
        >
          <template #empty-action>
            <DpcBtn variant="teal" size="sm" icon="Plus" @click="openAdd">
              {{ activeTab === 'consumables' ? (isAr ? 'أضف مستهلكاً' : 'Add consumable') : (isAr ? 'أضف خامة' : 'Add material') }}
            </DpcBtn>
          </template>

          <!-- Consumables table -->
          <div v-if="activeTab === 'consumables'" class="consumables-grid">
            <DpcTableHead>
              <DpcTableRow variant="header">
                <DpcTableCell type="header">{{ isAr ? 'الخامة' : 'Item' }}</DpcTableCell>
                <DpcTableCell type="header" align="end">{{ isAr ? 'سعر الباكيت' : 'Pack cost' }}</DpcTableCell>
                <DpcTableCell type="header" align="center">{{ isAr ? 'علب' : 'Cases' }}</DpcTableCell>
                <DpcTableCell type="header" align="center">{{ isAr ? 'وحدات' : 'Units' }}</DpcTableCell>
                <DpcTableCell type="header" align="end">{{ isAr ? 'تكلفة الوحدة' : 'Per unit' }}</DpcTableCell>
                <DpcTableCell type="header"></DpcTableCell>
              </DpcTableRow>
            </DpcTableHead>

            <DpcTableRow
              v-for="item in displayItems"
              :key="item.id"
              :selected="selectedItem?.id === item.id"
              @click="selectItem(item)"
            >
              <DpcTableCell type="text">
                <div class="item-cell">
                  <div class="item-icon" :class="selectedItem?.id === item.id && 'item-icon-teal'">
                    <DpcIcon name="Package" :size="14" :stroke-width="1.7" />
                  </div>
                  <div>
                    <div class="item-name">{{ itemName(item) }}</div>
                    <div class="item-sku">{{ item.sku || `CON-${item.id}` }}</div>
                  </div>
                </div>
              </DpcTableCell>
              <DpcTableCell type="number" class="t-sm">{{ fmtInt(item.pack_cost || 0) }}</DpcTableCell>
              <DpcTableCell type="number" align="center" class="t-sm text-faint">{{ item.cases_per_pack || item.cases || 1 }}</DpcTableCell>
              <DpcTableCell type="number" align="center" class="t-sm text-faint">{{ item.units_per_case || item.units || 1 }}</DpcTableCell>
              <DpcTableCell type="number" class="t-bold">{{ fmt(perUnit(item)) }}</DpcTableCell>
              <DpcTableCell type="action" align="end">
                <DpcBtn variant="ghost" size="xs" square icon="Trash2" :aria-label="isAr ? 'حذف' : 'Delete'" @click.stop="confirmDelete = item" />
              </DpcTableCell>
            </DpcTableRow>
          </div>

          <!-- Materials table -->
          <div v-else class="materials-grid">
            <DpcTableHead>
              <DpcTableRow variant="header">
                <DpcTableCell type="header">{{ isAr ? 'الخامة' : 'Material' }}</DpcTableCell>
                <DpcTableCell type="header">{{ isAr ? 'المعمل' : 'Lab' }}</DpcTableCell>
                <DpcTableCell type="header" align="end">{{ isAr ? 'تكلفة الوحدة' : 'Unit cost' }}</DpcTableCell>
                <DpcTableCell type="header"></DpcTableCell>
              </DpcTableRow>
            </DpcTableHead>

            <DpcTableRow
              v-for="item in displayItems"
              :key="item.id"
              :selected="selectedItem?.id === item.id"
              @click="selectItem(item)"
            >
              <DpcTableCell type="text">
                <div class="item-cell">
                  <div class="item-icon" :class="selectedItem?.id === item.id && 'item-icon-teal'">
                    <DpcIcon name="FlaskConical" :size="14" :stroke-width="1.7" />
                  </div>
                  <div>
                    <div class="item-name">{{ itemName(item) }}</div>
                    <div v-if="item.name_ar && isAr === false" class="item-sku">{{ item.name_ar }}</div>
                  </div>
                </div>
              </DpcTableCell>
              <DpcTableCell type="text" class="t-sm text-faint">{{ item.lab_name || '—' }}</DpcTableCell>
              <DpcTableCell type="number" class="t-bold">{{ fmt(item.unit_cost || 0) }}</DpcTableCell>
              <DpcTableCell type="action" align="end">
                <DpcBtn variant="ghost" size="xs" square icon="Trash2" :aria-label="isAr ? 'حذف' : 'Delete'" @click.stop="confirmDelete = item" />
              </DpcTableCell>
            </DpcTableRow>
          </div>
        </DpcTable>
      </div>
      <!-- /con-pane (table view) — grid view follows; edit panel is a
           sibling of both view modes, rendered after them. -->

      <!-- Premium Grid view -->
      <div
        v-else
        class="con-pane items-grid-view animate-fade-in-up"
        style="animation-delay: var(--stagger-2);"
      >
        <!-- Empty state -->
        <div v-if="displayItems.length === 0" class="grid-empty">
          <DpcIcon :name="activeTab === 'consumables' ? 'Package' : 'FlaskConical'" :size="48" :stroke-width="1.4" class="empty-icon" />
          <h3 class="empty-title">
            {{ activeTab === 'consumables'
              ? (isAr ? 'لم تُضف أي مستهلكات بعد' : 'No consumables yet')
              : (isAr ? 'لم تُضف أي خامات بعد' : 'No materials yet') }}
          </h3>
          <DpcBtn variant="teal" size="sm" icon="Plus" @click="openAdd">
            {{ activeTab === 'consumables' ? (isAr ? 'أضف مستهلكاً' : 'Add consumable') : (isAr ? 'أضف خامة' : 'Add material') }}
          </DpcBtn>
        </div>

        <!-- Grid cards -->
        <div v-else class="items-grid">
          <div
            v-for="(item, i) in displayItems"
            :key="item.id"
            :class="['item-card', selectedItem?.id === item.id && 'item-card-selected']"
            :style="{ animationDelay: `${Math.min(i * 50, 400)}ms` }"
            @click="selectItem(item)"
          >
            <div class="item-card-header">
              <div class="item-card-icon">
                <DpcIcon :name="activeTab === 'consumables' ? 'Package' : 'FlaskConical'" :size="20" :stroke-width="1.6" />
              </div>
              <button
                class="item-card-delete"
                @click.stop="confirmDelete = item"
                :title="isAr ? 'حذف' : 'Delete'"
              >
                <DpcIcon name="Trash2" :size="14" :stroke-width="2" />
              </button>
            </div>

            <div class="item-card-body">
              <h4 class="item-card-title">{{ itemName(item) }}</h4>
              <p v-if="activeTab === 'consumables'" class="item-card-sku">{{ item.sku || `CON-${item.id}` }}</p>
              <p v-else-if="item.lab_name" class="item-card-lab">{{ item.lab_name }}</p>
            </div>

            <div class="item-card-footer">
              <template v-if="activeTab === 'consumables'">
                <div class="item-card-stat">
                  <span class="stat-label">{{ isAr ? 'تكلفة/وحدة' : 'Per unit' }}</span>
                  <span class="stat-value dpc-num">{{ fmt(perUnit(item)) }}</span>
                </div>
                <div class="item-card-meta">
                  <span>{{ item.cases_per_pack || 1 }} × {{ item.units_per_case || 1 }}</span>
                </div>
              </template>
              <template v-else>
                <div class="item-card-stat">
                  <span class="stat-label">{{ isAr ? 'تكلفة الوحدة' : 'Unit cost' }}</span>
                  <span class="stat-value dpc-num">{{ fmt(item.unit_cost || 0) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
      <!-- /con-pane (grid view) -->

      <!-- Backdrop for mobile bottom-sheet edit panel. Click closes. -->
      <div
        v-if="selectedItem && isPhone"
        class="edit-backdrop"
        @click="selectedItem = null"
        aria-hidden="true"
      />

      <!-- Edit panel — visible whenever an item is selected,
           regardless of view mode. On desktop sits beside the pane
           (sticky); on phones takes over as a bottom sheet. -->
      <div v-if="selectedItem" class="dpc-panel edit-panel">
        <div class="edit-header">
          <div class="mini-eyebrow">{{ isAr ? 'تعديل' : 'Edit' }}</div>
          <DpcBtn variant="ghost" size="xs" square icon="X" :aria-label="isAr ? 'إغلاق' : 'Close'" @click="selectedItem = null" />
        </div>

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
                <input v-model.number="editForm.pack_cost" type="number" inputmode="decimal" class="edit-input" />
                <span class="input-suffix">{{ currency }}</span>
              </div>
            </div>
            <div class="two-col">
              <div>
                <label class="field-label">{{ isAr ? 'علب / باكيت' : 'Cases / pack' }}</label>
                <input v-model.number="editForm.cases_per_pack" type="number" inputmode="numeric" class="edit-input" />
              </div>
              <div>
                <label class="field-label">{{ isAr ? 'وحدات / علبة' : 'Units / case' }}</label>
                <input v-model.number="editForm.units_per_case" type="number" inputmode="numeric" class="edit-input" />
              </div>
            </div>
            <div class="computed-box">
              <div class="computed-label">{{ isAr ? 'تكلفة الوحدة المحسوبة' : 'Computed per-unit cost' }}</div>
              <div class="dpc-num computed-value">{{ fmt(computedPerUnit) }} <span class="computed-unit">{{ currency }}</span></div>
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
              <label class="field-label">{{ isAr ? 'اسم المعمل' : 'Lab name' }}</label>
              <input v-model="editForm.lab_name" class="edit-input" :placeholder="isAr ? 'اختياري' : 'Optional'" />
            </div>
            <div>
              <label class="field-label">{{ isAr ? 'تكلفة الوحدة' : 'Unit cost' }}</label>
              <div class="input-with-suffix">
                <input v-model.number="editForm.unit_cost" type="number" inputmode="decimal" class="edit-input" />
                <span class="input-suffix">{{ currency }}</span>
              </div>
            </div>
          </div>
        </template>

        <div class="edit-actions">
          <DpcBtn variant="ghost" @click="selectedItem = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</DpcBtn>
          <DpcBtn variant="teal" @click="saveEdit">{{ isAr ? 'حفظ' : 'Save' }}</DpcBtn>
        </div>
      </div>
    </div>
    <!-- /con-content -->
    </div>
    <!-- /con-body -->

    <!-- Add modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="dpc-h modal-title">
            {{ activeTab === 'consumables' ? (isAr ? 'إضافة مستهلك' : 'Add consumable') : (isAr ? 'إضافة خامة' : 'Add material') }}
          </h2>
          <DpcBtn variant="ghost" size="xs" square icon="X" aria-label="Close" @click="showAddModal = false" />
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
                    <label class="field-label">{{ isAr ? 'علب / باكيت *' : 'Cases per pack *' }}</label>
                    <input v-model.number="newItem.cases_per_pack" type="number" min="1" class="edit-input" placeholder="e.g., 10" />
                  </div>
                </div>
                <div class="pkg-arrow">↓</div>
                <!-- Step 3 -->
                <div class="pkg-step">
                  <div class="pkg-step-num">3</div>
                  <div class="pkg-step-body">
                    <label class="field-label">{{ isAr ? 'وحدات / علبة *' : 'Units per case *' }}</label>
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
                  <small>{{ currency }} / unit</small>
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
              <label class="field-label">{{ isAr ? 'اسم المعمل' : 'Lab name' }}</label>
              <input v-model="newItem.lab_name" class="edit-input" :placeholder="isAr ? 'اختياري' : 'Optional'" />
            </div>
            <div class="form-group">
              <label class="field-label">{{ isAr ? 'تكلفة الوحدة *' : 'Unit cost *' }}</label>
              <input v-model.number="newItem.unit_cost" type="number" step="0.01" class="edit-input" :placeholder="isAr ? 'مثال: 500' : 'e.g., 500'" />
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <DpcBtn variant="ghost" @click="showAddModal = false">{{ isAr ? 'إلغاء' : 'Cancel' }}</DpcBtn>
          <DpcBtn variant="teal" @click="addNew">{{ isAr ? 'إضافة' : 'Add' }}</DpcBtn>
        </div>
      </div>
    </div>

    <!-- Confirm delete -->
    <div v-if="confirmDelete" class="modal-overlay" @click.self="confirmDelete = null">
      <div class="modal-box confirm-box">
        <div class="dpc-h modal-title" style="padding:20px 24px;">{{ isAr ? 'تأكيد الحذف' : 'Confirm delete' }}</div>
        <p class="confirm-text">{{ isAr ? 'هل تريد حذف هذا العنصر؟ لا يمكن التراجع.' : 'Delete this item? This cannot be undone.' }}</p>
        <div class="modal-footer">
          <DpcBtn variant="ghost" @click="confirmDelete = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</DpcBtn>
          <DpcBtn variant="danger" @click="deleteItem">{{ isAr ? 'حذف' : 'Delete' }}</DpcBtn>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
/* ── Premium view toggle ──────────────────────────────────── */
.view-toggle {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: inset 0 0 0 1px var(--line);
}

.view-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: calc(var(--radius-md) - 3px);
  background: transparent;
  color: var(--ink-500);
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.view-btn:hover {
  background: var(--paper-2);
  color: var(--ink-900);
}

.view-btn-active {
  background: var(--teal-600);
  color: white;
  box-shadow: 0 2px 4px rgba(20, 184, 166, 0.2);
}

.view-btn-active:hover {
  background: var(--teal-700);
}

/* Tab bar with smooth animation */
.tab-bar {
  display: flex; gap: 4px; padding: 14px 28px 0;
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 10px 10px 0 0;
  font-size: 13px; font-weight: 500; color: var(--ink-500);
  background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  cursor: pointer; border: none;
  transition:
    background 180ms var(--ease-out-expo),
    color 180ms var(--ease-out-expo),
    transform 150ms var(--ease-out-expo),
    box-shadow 180ms var(--ease-out-expo);
}
.tab-btn:hover:not(.tab-btn-active) {
  background: var(--paper-2);
  color: var(--ink-700);
  transform: translateY(-1px);
}
.tab-btn-active {
  background: var(--paper);
  color: var(--ink-900);
  font-weight: 600;
  box-shadow: 0 -1px 0 0 var(--paper) inset, 0 0 0 1px var(--line) inset;
  transform: translateY(0);
}
.tab-count {
  font-family: var(--font-mono); font-size: 11px;
  padding: 1px 6px; border-radius: 99px;
  background: var(--paper-2); color: var(--ink-500);
  transition: all 180ms var(--ease-out-expo);
}
.tab-btn-active .tab-count {
  background: var(--teal-50);
  color: var(--teal-700);
}

.con-body { padding: 0 28px 28px; }

.grid-layout {
  display: grid; grid-template-columns: 1fr 360px; gap: 18px; align-items: start;
  padding-top: 18px;
}

/* New layout host: holds both view modes + the edit panel as a third
   column when an item is selected and there's room. On phones the
   edit panel becomes a bottom sheet instead. */
.con-content {
  display: grid;
  gap: 18px;
  padding-top: 18px;
  grid-template-columns: 1fr;
  align-items: start;
}

@media (min-width: 1024px) {
  .con-content.con-content--has-edit { grid-template-columns: 1fr 360px; }
}

/* Table grids */
.consumables-table {
  animation: fadeIn 300ms var(--ease-out-expo);
}

.consumables-grid {
  display: grid;
  grid-template-columns: minmax(180px,2fr) 100px 70px 70px 110px 44px;
  align-items: center;
}

.materials-grid {
  display: grid;
  grid-template-columns: minmax(180px,2fr) minmax(120px,1fr) 110px 44px;
  align-items: center;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.item-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex: none;
  background: var(--paper-2);
  color: var(--ink-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--line);
  transition:
    background 200ms var(--ease-out-expo),
    color 200ms var(--ease-out-expo),
    box-shadow 200ms var(--ease-out-expo),
    transform 200ms var(--ease-out-expo);
}

.item-icon-teal {
  background: var(--teal-100);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1px var(--teal-200);
  transform: scale(1.05);
}

.item-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-900);
}

.item-sku {
  font-size: 11px;
  color: var(--ink-500);
}

.t-sm    { font-size: 13px; color: var(--ink-700); }
.t-bold  { font-weight: 600; color: var(--ink-900); }
.text-faint { color: var(--ink-500); }

/* Empty state */
.empty-state {
  padding: 40px 24px; text-align: center; display: flex; flex-direction: column;
  align-items: center; gap: 12px; color: var(--ink-400);
}
.empty-icon { color: var(--ink-300); }

/* Edit panel with slide-in animation */
.edit-panel {
  padding: 22px;
  position: sticky;
  top: 16px;
  animation: slideInRight 320ms var(--ease-out-expo);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.mini-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--teal-700);
}

.edit-empty {
  text-align: center;
  padding: 32px 0;
  color: var(--ink-400);
  font-size: 13.5px;
}

.empty-icon-sm {
  margin: 0 auto 12px;
  display: block;
  color: var(--ink-300);
}

.selected-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  padding: 12px;
  border-radius: 12px;
  background: var(--paper-2);
  animation: slideDown 280ms var(--ease-out-expo);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.selected-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex: none;
  background: var(--surface);
  color: var(--ink-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--line);
}

.selected-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.selected-sku {
  font-size: 11.5px;
  color: var(--ink-500);
}

.edit-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: slideDown 300ms var(--ease-out-expo);
}

.field-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-700);
  display: block;
  margin-bottom: 4px;
}

.edit-input {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 14px;
  border: none;
  outline: none;
  transition:
    box-shadow 200ms var(--ease-out-expo),
    background 200ms var(--ease-out-expo);
}

.edit-input:focus {
  box-shadow: inset 0 0 0 1.5px var(--teal-600);
  background: var(--paper);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.input-with-suffix {
  position: relative;
}

.input-suffix {
  position: absolute;
  inset-inline-end: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--ink-400);
  pointer-events: none;
}

.computed-box {
  padding: 14px;
  border-radius: 12px;
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1px var(--teal-100);
  animation: pulse 600ms var(--ease-out-expo);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: inset 0 0 0 1px var(--teal-100);
  }
  50% {
    transform: scale(1.02);
    box-shadow: inset 0 0 0 2px var(--teal-200);
  }
}

.computed-label {
  font-size: 11.5px;
  color: var(--teal-700);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.computed-value {
  font-size: 26px;
  font-weight: 600;
  color: var(--teal-800);
}

.computed-unit {
  font-size: 12px;
  color: var(--teal-700);
  font-family: var(--font-sans);
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  animation: slideUp 320ms var(--ease-out-expo) 100ms backwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

/* ── Premium Grid View ────────────────────────────────────── */
.items-grid-view {
  padding-top: 20px;
}

.grid-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  text-align: center;
}

.grid-empty .empty-icon {
  color: var(--ink-300);
  animation: float 4s var(--ease-in-out-expo) infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.grid-empty .empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink-700);
  margin: 0;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.item-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 18px;
  border: 1.5px solid var(--line);
  cursor: pointer;
  transition: all var(--duration-fast);
  animation: scale-in 0.3s var(--ease-out-expo) backwards;
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.item-card:hover {
  border-color: var(--teal-300);
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.12);
  transform: translateY(-2px);
}

.item-card-selected {
  border-color: var(--teal-600);
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1px var(--teal-200), 0 4px 12px rgba(20, 184, 166, 0.15);
}

.item-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.item-card-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--teal-100);
  transition: all var(--duration-fast);
}

.item-card-selected .item-card-icon {
  background: var(--teal-100);
  box-shadow: inset 0 0 0 1px var(--teal-200), 0 2px 6px rgba(20, 184, 166, 0.15);
}

.item-card-delete {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-400);
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--duration-fast);
  opacity: 0;
}

.item-card:hover .item-card-delete {
  opacity: 1;
}

.item-card-delete:hover {
  background: var(--danger-50);
  color: var(--danger-700);
}

.item-card-body {
  margin-bottom: 14px;
}

.item-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
  margin: 0 0 4px;
  line-height: 1.3;
}

.item-card-sku,
.item-card-lab {
  font-size: 12px;
  color: var(--ink-500);
  margin: 0;
}

.item-card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--line-2);
}

.item-card-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-500);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--teal-700);
  font-variant-numeric: tabular-nums;
}

.item-card-meta {
  font-size: 12px;
  color: var(--ink-500);
  font-family: var(--font-mono);
}

/* ──────────────────────────────────────────────────────────────
   RESPONSIVE — tighten outer padding so tabs and item cards keep
   breathing room on phones. Inner data tables that exceed the
   viewport get horizontal scroll via DpcTable's scroll container.
   ────────────────────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .tab-bar { padding: 14px var(--gutter, 16px) 0; flex-wrap: wrap; }
  .con-body { padding: 0 var(--gutter, 16px) 24px; }
}

@media (max-width: 767px) {
  .tab-bar { padding: 12px var(--gutter, 16px) 0; gap: 2px; }
  .tab-btn { padding: 7px 12px; font-size: 12.5px; }
  .con-body { padding: 0 var(--gutter, 16px) 32px; }

  /* Hide the table-view toggle button on phones — the 5/6-column
     table is unreadable here and we force grid view in JS. */
  .view-toggle { display: none; }

  /* Edit panel becomes a bottom sheet so editing remains accessible
     when the list is shown as cards. */
  .edit-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 20, 36, 0.55);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: var(--z-overlay);
    animation: edit-backdrop-fade 220ms ease;
  }
  @keyframes edit-backdrop-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .con-content .edit-panel {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    top: auto;
    margin: 0;
    width: 100%;
    border-radius: var(--radius-xl, 24px) var(--radius-xl, 24px) 0 0;
    z-index: var(--z-modal);
    max-height: 88vh;
    max-height: 88svh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 16px var(--gutter, 16px);
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    box-shadow: 0 -8px 32px rgba(15, 37, 69, 0.22);
    animation: edit-sheet-slide-up 280ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  }
  @keyframes edit-sheet-slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  /* Tighter form fields on the sheet — sheet padding handles the
     outer gutter, so two-col can flex normally. */
  .con-content .edit-panel .two-col { gap: 10px; }
}
</style>
