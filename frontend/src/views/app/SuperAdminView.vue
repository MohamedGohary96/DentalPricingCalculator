<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const auth   = useAuthStore()
const i18n   = useI18nStore()
const router = useRouter()
const isAr   = computed(() => i18n.locale === 'ar')

const clinics  = ref([])
const stats    = ref(null)
const search   = ref('')
const toggling = ref(null)
const loaded   = ref(false)
const editing    = ref(null)
const editPlan   = ref('')
const editStatus = ref('')
const editExpiry = ref('')
const saving     = ref(false)

// Contact settings state
const contactSettings = ref({})
const editingContact = ref(false)
const savingContact = ref(false)
const editContactForm = ref({
  contact_email: '',
  contact_phone: '',
  contact_whatsapp: '',
  contact_email_ar: '',
  contact_phone_ar: '',
  contact_whatsapp_ar: ''
})

const PLANS   = ['professional']
const STATUSES = ['trial', 'active', 'grace_period', 'expired', 'suspended']

function startEdit(clinic) {
  editing.value    = clinic.id
  editPlan.value   = clinic.subscription_plan || 'professional'
  editStatus.value = clinic.subscription_info?.status || 'trial'
  editExpiry.value = clinic.subscription_expires_at
    ? new Date(clinic.subscription_expires_at).toISOString().slice(0, 10)
    : ''
}

function cancelEdit() {
  editing.value = null
}

async function saveSubscription(id) {
  saving.value = true
  try {
    await axios.put(`/api/super-admin/clinics/${id}/subscription`, {
      subscription_plan:        editPlan.value,
      subscription_status:      editStatus.value,
      subscription_expires_at:  editExpiry.value || null,
    }, { withCredentials: true })
    const clinic = clinics.value.find(x => x.id === id)
    if (clinic) {
      clinic.subscription_plan        = editPlan.value
      clinic.subscription_expires_at  = editExpiry.value || null
      clinic.subscription_info        = { ...clinic.subscription_info, status: editStatus.value }
    }
    editing.value = null
  } catch { /* ignore */ }
  finally { saving.value = false }
}

function startEditContact() {
  editContactForm.value = { ...contactSettings.value }
  editingContact.value = true
}

function cancelEditContact() {
  editingContact.value = false
}

async function saveContactSettings() {
  savingContact.value = true
  try {
    await axios.put('/api/super-admin/settings/contact', editContactForm.value, { withCredentials: true })
    contactSettings.value = { ...editContactForm.value }
    editingContact.value = false
  } catch (err) {
    console.error('Failed to save contact settings:', err)
  } finally {
    savingContact.value = false
  }
}

const statusMap = computed(() => ({
  active:       { label: isAr.value ? 'نشط'    : 'Active',    bg: 'var(--teal-50)',       fg: 'var(--teal-700)',    dot: 'var(--teal-600)'    },
  trial:        { label: isAr.value ? 'تجريبي' : 'Trial',     bg: 'rgba(14,165,233,.08)', fg: '#0284c7',            dot: '#0284c7'            },
  grace_period: { label: isAr.value ? 'مهلة'   : 'Grace',     bg: 'var(--warning-50)',    fg: 'var(--warning-700)', dot: 'var(--warning-600)' },
  expired:      { label: isAr.value ? 'منتهي'  : 'Expired',   bg: 'var(--danger-50)',     fg: 'var(--danger-700)',  dot: 'var(--danger-600)'  },
  suspended:    { label: isAr.value ? 'موقوف'  : 'Suspended', bg: 'var(--paper-2)',       fg: 'var(--ink-500)',     dot: 'var(--ink-400)'     },
}))

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const displayClinics = computed(() => {
  if (!search.value) return clinics.value
  const q = search.value.toLowerCase()
  return clinics.value.filter(c =>
    (c.name        || '').toLowerCase().includes(q) ||
    (c.email       || '').toLowerCase().includes(q) ||
    (c.owner_email || '').toLowerCase().includes(q) ||
    (c.phone       || '').toLowerCase().includes(q) ||
    (c.city        || '').toLowerCase().includes(q)
  )
})

const displayStats = computed(() => stats.value || {})

async function toggleStatus(id) {
  if (toggling.value) return
  const clinic = clinics.value.find(x => x.id === id)
  if (!clinic) return
  const action = clinic.is_active ? 'deactivate' : 'activate'
  const confirmed = window.confirm(
    isAr.value
      ? `هل تريد ${action === 'deactivate' ? 'إيقاف' : 'تفعيل'} عيادة "${clinic.name}"؟`
      : `Are you sure you want to ${action} "${clinic.name}"?`
  )
  if (!confirmed) return
  toggling.value = id
  try {
    const { data } = await axios.put(`/api/super-admin/clinics/${id}/toggle-status`, {}, { withCredentials: true })
    if (clinic) clinic.is_active = data.is_active
  } catch { /* ignore */ }
  finally { toggling.value = null }
}

onMounted(async () => {
  if (auth.user && !auth.user.is_super_admin) {
    router.push('/app/dashboard')
    return
  }
  try {
    const [c, s, contact] = await Promise.all([
      axios.get('/api/super-admin/clinics', { withCredentials: true }),
      axios.get('/api/super-admin/stats',   { withCredentials: true }),
      axios.get('/api/super-admin/settings/contact', { withCredentials: true }),
    ])
    clinics.value = c.data
    stats.value   = s.data
    contactSettings.value = contact.data
  } catch { /* show empty */ }
  loaded.value = true
})
</script>

<template>
  <AppShell active-key="dashboard">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <div class="eyebrow-admin">{{ isAr ? 'إدارة عليا' : 'Super admin' }}</div>
        <h1 class="dpc-h page-title">{{ isAr ? 'كل العيادات' : 'All clinics' }}</h1>
        <p class="page-sub">{{ isAr ? 'إدارة الحسابات والاشتراكات في كل المنصة.' : 'Manage accounts and subscriptions across the entire platform.' }}</p>
      </div>
      <div class="header-actions">
        <div class="search-wrap">
          <DpcIcon name="Search" :size="15" :stroke-width="1.6" class="search-icon" />
          <input v-model="search" :placeholder="isAr ? 'ابحث عن عيادة...' : 'Search clinics...'" class="search-input" />
        </div>
        <LangSwitch />
      </div>
    </div>

    <div class="admin-body">
      <!-- KPI row -->
      <div class="kpi-grid">
        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'إجمالي العيادات' : 'Total clinics' }}</span>
            <div class="kpi-icon kpi-icon-ink"><DpcIcon name="Building2" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom">
            <span class="dpc-num kpi-value">{{ displayStats.total_clinics ?? '—' }}</span>
          </div>
        </div>

        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'نشطة الآن' : 'Active now' }}</span>
            <div class="kpi-icon kpi-icon-teal"><DpcIcon name="TrendingUp" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom">
            <span class="dpc-num kpi-value">{{ displayStats.active_subscriptions ?? '—' }}</span>
            <span v-if="displayStats.total_clinics" class="kpi-unit">/ {{ displayStats.total_clinics }}</span>
          </div>
        </div>

        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'إيرادات الشهر' : 'This month' }}</span>
            <div class="kpi-icon kpi-icon-teal"><DpcIcon name="CircleDollarSign" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom">
            <span class="dpc-num kpi-value">{{ fmt(displayStats.monthly_revenue) }}</span>
            <span class="kpi-unit">{{ isAr ? 'ج.م' : 'EGP' }}</span>
          </div>
        </div>

        <div class="dpc-panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ isAr ? 'تجريبية' : 'Trial' }}</span>
            <div class="kpi-icon kpi-icon-info"><DpcIcon name="Clock" :size="13" :stroke-width="1.7" /></div>
          </div>
          <div class="kpi-bottom">
            <span class="dpc-num kpi-value">{{ displayStats.trial_clinics ?? '—' }}</span>
            <span v-if="displayStats.expired_clinics" class="kpi-unit">+ {{ displayStats.expired_clinics }} {{ isAr ? 'منتهية' : 'expired' }}</span>
          </div>
        </div>
      </div>

      <!-- Contact Settings Section -->
      <div class="dpc-panel contact-settings-panel">
        <div class="section-header">
          <div>
            <div class="section-title">
              <DpcIcon name="Headphones" :size="18" :stroke-width="1.7" style="margin-inline-end: 8px;" />
              {{ isAr ? 'معلومات التواصل' : 'Contact Information' }}
            </div>
            <div class="section-subtitle">
              {{ isAr ? 'تظهر في صفحة الاشتراكات لجميع المستخدمين' : 'Displayed on subscription page for all users' }}
            </div>
          </div>
          <button
            v-if="!editingContact"
            class="edit-contact-btn"
            @click="startEditContact"
          >
            <DpcIcon name="Pencil" :size="14" :stroke-width="1.7" />
            {{ isAr ? 'تعديل' : 'Edit' }}
          </button>
        </div>

        <!-- View mode -->
        <div v-if="!editingContact" class="contact-view-grid">
          <div class="contact-view-item">
            <div class="contact-view-label">{{ isAr ? 'البريد الإلكتروني (EN)' : 'Email (EN)' }}</div>
            <div class="contact-view-value">{{ contactSettings.contact_email || '—' }}</div>
          </div>
          <div class="contact-view-item">
            <div class="contact-view-label">{{ isAr ? 'الهاتف (EN)' : 'Phone (EN)' }}</div>
            <div class="contact-view-value">{{ contactSettings.contact_phone || '—' }}</div>
          </div>
          <div class="contact-view-item">
            <div class="contact-view-label">{{ isAr ? 'واتساب (EN)' : 'WhatsApp (EN)' }}</div>
            <div class="contact-view-value">{{ contactSettings.contact_whatsapp || '—' }}</div>
          </div>
          <div class="contact-view-item">
            <div class="contact-view-label">{{ isAr ? 'البريد الإلكتروني (AR)' : 'Email (AR)' }}</div>
            <div class="contact-view-value">{{ contactSettings.contact_email_ar || '—' }}</div>
          </div>
          <div class="contact-view-item">
            <div class="contact-view-label">{{ isAr ? 'الهاتف (AR)' : 'Phone (AR)' }}</div>
            <div class="contact-view-value">{{ contactSettings.contact_phone_ar || '—' }}</div>
          </div>
          <div class="contact-view-item">
            <div class="contact-view-label">{{ isAr ? 'واتساب (AR)' : 'WhatsApp (AR)' }}</div>
            <div class="contact-view-value">{{ contactSettings.contact_whatsapp_ar || '—' }}</div>
          </div>
        </div>

        <!-- Edit mode -->
        <div v-else class="contact-edit-form">
          <div class="contact-edit-group">
            <div class="contact-edit-header">{{ isAr ? 'النسخة الإنجليزية' : 'English Version' }}</div>
            <div class="contact-edit-grid">
              <div class="form-field">
                <label class="field-label">{{ isAr ? 'البريد الإلكتروني' : 'Email' }}</label>
                <input v-model="editContactForm.contact_email" type="email" class="field-input" placeholder="support@example.com" />
              </div>
              <div class="form-field">
                <label class="field-label">{{ isAr ? 'الهاتف' : 'Phone' }}</label>
                <input v-model="editContactForm.contact_phone" type="text" class="field-input" placeholder="+201015755890" />
              </div>
              <div class="form-field">
                <label class="field-label">{{ isAr ? 'واتساب' : 'WhatsApp' }}</label>
                <input v-model="editContactForm.contact_whatsapp" type="text" class="field-input" placeholder="+201015755890" />
              </div>
            </div>
          </div>

          <div class="contact-edit-group">
            <div class="contact-edit-header">{{ isAr ? 'النسخة العربية' : 'Arabic Version' }}</div>
            <div class="contact-edit-grid">
              <div class="form-field">
                <label class="field-label">{{ isAr ? 'البريد الإلكتروني' : 'Email' }}</label>
                <input v-model="editContactForm.contact_email_ar" type="email" class="field-input" placeholder="support@example.com" />
              </div>
              <div class="form-field">
                <label class="field-label">{{ isAr ? 'الهاتف' : 'Phone' }}</label>
                <input v-model="editContactForm.contact_phone_ar" type="text" class="field-input" placeholder="+201015755890" dir="ltr" />
              </div>
              <div class="form-field">
                <label class="field-label">{{ isAr ? 'واتساب' : 'WhatsApp' }}</label>
                <input v-model="editContactForm.contact_whatsapp_ar" type="text" class="field-input" placeholder="+201015755890" dir="ltr" />
              </div>
            </div>
          </div>

          <div class="contact-edit-actions">
            <button class="save-contact-btn" :disabled="savingContact" @click="saveContactSettings">
              <DpcIcon name="Check" :size="14" :stroke-width="2" />
              {{ isAr ? 'حفظ التغييرات' : 'Save changes' }}
            </button>
            <button class="cancel-contact-btn" @click="cancelEditContact">
              {{ isAr ? 'إلغاء' : 'Cancel' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Clinics table -->
      <div class="dpc-panel table-wrap">
        <div class="table-head">
          <div>{{ isAr ? 'العيادة' : 'Clinic' }}</div>
          <div>{{ isAr ? 'المدينة' : 'City' }}</div>
          <div>{{ isAr ? 'تواصل' : 'Contact' }}</div>
          <div class="col-center">{{ isAr ? 'مستخدمون' : 'Users' }}</div>
          <div class="col-center">{{ isAr ? 'خدمات' : 'Services' }}</div>
          <div class="col-center">{{ isAr ? 'الاشتراك' : 'Status' }}</div>
          <div class="col-center">{{ isAr ? 'ينتهي' : 'Expires' }}</div>
          <div class="col-end">{{ isAr ? 'إجراء' : 'Action' }}</div>
        </div>

        <!-- Empty state -->
        <div v-if="loaded && displayClinics.length === 0" class="empty-state">
          <DpcIcon name="Building2" :size="32" :stroke-width="1.2" class="empty-icon" />
          <p>{{ search ? (isAr ? 'لا توجد نتائج' : 'No clinics match your search') : (isAr ? 'لا توجد عيادات بعد' : 'No clinics yet') }}</p>
        </div>

        <template v-for="(c, i) in displayClinics" :key="c.id">
          <div :class="['table-row', (i < displayClinics.length - 1 || editing === c.id) && 'row-border', !c.is_active && 'row-inactive']">
            <!-- Clinic name + email -->
            <div class="clinic-cell">
              <div class="clinic-avatar">{{ initials(c.name) }}</div>
              <div class="clinic-info">
                <div class="clinic-name">{{ c.name }}</div>
                <div class="clinic-last">{{ c.email }}</div>
              </div>
            </div>
            <!-- City -->
            <div class="t-sm">{{ c.city || '—' }}</div>
            <!-- Contact: owner email + phone -->
            <div class="contact-cell">
              <div v-if="c.owner_email" class="contact-row">
                <span class="contact-tag">{{ isAr ? 'المالك' : 'Owner' }}</span>
                <span class="contact-email">{{ c.owner_email }}</span>
              </div>
              <div v-if="c.email" class="contact-row">
                <span class="contact-tag">{{ isAr ? 'العيادة' : 'Clinic' }}</span>
                <span class="contact-email">{{ c.email }}</span>
              </div>
              <div v-if="c.phone" class="contact-phone">{{ c.phone }}</div>
            </div>
            <!-- Users -->
            <div class="dpc-num col-center t-sm">{{ c.user_count ?? '—' }}</div>
            <!-- Services -->
            <div class="dpc-num col-center t-sm">{{ c.service_count ?? '—' }}</div>
            <!-- Subscription status badge -->
            <div class="col-center">
              <span
                class="status-badge"
                :style="{
                  background: (statusMap[c.subscription_info?.status] || statusMap.expired).bg,
                  color:      (statusMap[c.subscription_info?.status] || statusMap.expired).fg
                }"
              >
                <span class="badge-dot" :style="{ background: (statusMap[c.subscription_info?.status] || statusMap.expired).dot }" />
                {{ (statusMap[c.subscription_info?.status] || statusMap.expired).label }}
              </span>
            </div>
            <!-- Expires -->
            <div class="col-center t-sm">{{ fmtDate(c.subscription_expires_at) }}</div>
            <!-- Actions -->
            <div class="col-end actions-cell">
              <button
                class="toggle-btn"
                :class="c.is_active ? 'toggle-lock' : 'toggle-unlock'"
                :disabled="toggling === c.id || c.id === 1"
                :title="c.is_active ? (isAr ? 'تعطيل' : 'Suspend') : (isAr ? 'تفعيل' : 'Activate')"
                @click="toggleStatus(c.id)"
              >
                <DpcIcon :name="c.is_active ? 'Lock' : 'LockOpen'" :size="12" :stroke-width="1.7" />
                {{ c.is_active ? (isAr ? 'تعطيل' : 'Suspend') : (isAr ? 'تفعيل' : 'Activate') }}
              </button>
              <button
                class="edit-btn"
                :class="editing === c.id && 'edit-btn-active'"
                :title="isAr ? 'تعديل الاشتراك' : 'Edit subscription'"
                @click="editing === c.id ? cancelEdit() : startEdit(c)"
              >
                <DpcIcon :name="editing === c.id ? 'X' : 'Pencil'" :size="12" :stroke-width="1.7" />
              </button>
            </div>
          </div>

          <!-- Inline subscription editor -->
          <div v-if="editing === c.id" class="edit-row">
            <div class="edit-row-inner">
              <div class="edit-field">
                <label class="edit-label">{{ isAr ? 'الخطة' : 'Plan' }}</label>
                <select v-model="editPlan" class="edit-select">
                  <option v-for="p in PLANS" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="edit-field">
                <label class="edit-label">{{ isAr ? 'الحالة' : 'Status' }}</label>
                <select v-model="editStatus" class="edit-select">
                  <option v-for="s in STATUSES" :key="s" :value="s">{{ statusMap[s]?.label || s }}</option>
                </select>
              </div>
              <div class="edit-field">
                <label class="edit-label">{{ isAr ? 'تاريخ الانتهاء' : 'Expiry date' }}</label>
                <input v-model="editExpiry" type="date" class="edit-select" />
              </div>
              <div class="edit-actions">
                <button class="save-btn" :disabled="saving" @click="saveSubscription(c.id)">
                  <DpcIcon name="Check" :size="12" :stroke-width="2" />
                  {{ isAr ? 'حفظ' : 'Save' }}
                </button>
                <button class="cancel-btn" @click="cancelEdit">
                  {{ isAr ? 'إلغاء' : 'Cancel' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.page-header {
  padding: 22px 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  background: var(--paper); border-bottom: 1px solid var(--line);
}
.eyebrow-admin { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal-700); margin-bottom: 4px; }
.page-title { font-size: 24px; margin-bottom: 4px; }
.page-sub   { color: var(--ink-500); font-size: 13.5px; margin: 0; }
.header-actions { display: flex; gap: 8px; align-items: center; }

.search-wrap { position: relative; }
.search-icon { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-400); pointer-events: none; }
.search-input {
  height: 36px; padding: 0 14px 0 36px; width: 240px;
  border-radius: 10px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px; outline: none; border: none;
}

.admin-body { padding: 20px 28px; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.kpi-card { padding: 18px; }
.kpi-top  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.kpi-label { font-size: 11.5px; font-weight: 600; color: var(--ink-500); letter-spacing: 0.04em; text-transform: uppercase; }
.kpi-icon { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; }
.kpi-icon-teal   { background: var(--teal-50);    color: var(--teal-700); }
.kpi-icon-ink    { background: var(--paper-2);    color: var(--ink-700); }
.kpi-icon-info   { background: rgba(14,165,233,.1); color: #0284c7; }
.kpi-bottom { display: flex; align-items: baseline; gap: 6px; }
.kpi-value  { font-size: 26px; font-weight: 600; color: var(--ink-900); }
.kpi-unit   { font-size: 12px; color: var(--ink-500); }

.table-wrap { overflow: hidden; }
.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(0,1.6fr) 100px minmax(0,1.4fr) 70px 70px 120px 110px 110px;
  align-items: center;
  padding: 12px 18px;
}
.table-head {
  background: var(--paper-2); border-bottom: 1px solid var(--line);
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-500);
}
.row-border   { border-bottom: 1px solid var(--line-2, #f0eeea); }
.row-inactive { opacity: 0.55; }

.col-center { text-align: center; }
.col-end    { text-align: end; }
.t-sm       { font-size: 13px; color: var(--ink-700); }

.clinic-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
.clinic-avatar {
  width: 30px; height: 30px; border-radius: 50%; flex: none;
  background: linear-gradient(135deg, var(--teal-500), var(--navy-700, #163058));
  color: #fff; display: grid; place-items: center; font-weight: 600; font-size: 10.5px;
}
.clinic-name { font-size: 13.5px; font-weight: 500; color: var(--ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.clinic-last { font-size: 11px; color: var(--ink-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.contact-cell  { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.contact-row   { display: flex; align-items: center; gap: 5px; min-width: 0; }
.contact-tag   { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-400); flex: none; }
.contact-email { font-size: 11.5px; color: var(--ink-700); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.contact-phone { font-size: 11px; color: var(--ink-500); font-family: var(--font-mono); }

.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; }
.badge-dot    { width: 5px; height: 5px; border-radius: 50%; flex: none; }

.toggle-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 10px; border-radius: 7px;
  font-size: 11.5px; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.toggle-lock   { background: var(--danger-50);  color: var(--danger-700); }
.toggle-lock:hover:not(:disabled)   { background: var(--danger-100, #fee2e2); }
.toggle-unlock { background: var(--teal-50);    color: var(--teal-700);   }
.toggle-unlock:hover:not(:disabled) { background: var(--teal-100, #ccfbf1); }

.empty-state {
  padding: 48px 24px; text-align: center;
  color: var(--ink-400); display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.empty-icon { color: var(--ink-300); }
.empty-state p { font-size: 14px; margin: 0; }

.actions-cell { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }

.edit-btn {
  width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center;
  background: var(--paper-2); color: var(--ink-500); cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.edit-btn:hover   { background: var(--teal-50); color: var(--teal-700); }
.edit-btn-active  { background: var(--paper-3, #e8e5e0); color: var(--ink-700); }

.edit-row { border-bottom: 1px solid var(--line-2, #f0eeea); }
.edit-row-inner {
  display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap;
  padding: 14px 18px; background: var(--paper-2);
}
.edit-field { display: flex; flex-direction: column; gap: 5px; }
.edit-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-500); }
.edit-select {
  height: 32px; padding: 0 10px; border-radius: 8px; font-size: 12.5px;
  background: var(--paper); box-shadow: inset 0 0 0 1px var(--line);
  border: none; outline: none; cursor: pointer; color: var(--ink-900); min-width: 140px;
}
.edit-actions { display: flex; align-items: center; gap: 6px; margin-inline-start: auto; }
.save-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 14px; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  background: var(--teal-600, #0d9488); color: #fff;
  transition: opacity 0.15s;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.save-btn:hover:not(:disabled) { opacity: 0.88; }
.cancel-btn {
  height: 32px; padding: 0 12px; border-radius: 8px;
  font-size: 12px; font-weight: 500; cursor: pointer;
  background: transparent; color: var(--ink-500);
}
.cancel-btn:hover { color: var(--ink-900); }

/* Contact Settings Section */
.contact-settings-panel {
  margin-bottom: 20px;
  padding: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-2, #f0eeea);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink-900);
  display: flex;
  align-items: center;
}

.section-subtitle {
  font-size: 12px;
  color: var(--ink-500);
  margin-top: 4px;
}

.edit-contact-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  background: var(--teal-50);
  color: var(--teal-700);
  transition: background 0.15s;
}

.edit-contact-btn:hover {
  background: var(--teal-100, #ccfbf1);
}

/* View Mode */
.contact-view-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.contact-view-item {
  padding: 12px;
  background: var(--paper-2);
  border-radius: 8px;
}

.contact-view-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-500);
  margin-bottom: 6px;
}

.contact-view-value {
  font-size: 13px;
  color: var(--ink-900);
  font-family: var(--font-mono, monospace);
}

/* Edit Mode */
.contact-edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contact-edit-group {
  padding: 16px;
  background: var(--paper-2);
  border-radius: 10px;
}

.contact-edit-header {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-600);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line-2, #f0eeea);
}

.contact-edit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-500);
}

.field-input {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--paper);
  box-shadow: inset 0 0 0 1px var(--line);
  border: none;
  outline: none;
  color: var(--ink-900);
  transition: box-shadow 0.15s;
}

.field-input:focus {
  box-shadow: inset 0 0 0 1.5px var(--teal-500);
}

.contact-edit-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.save-contact-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 20px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: var(--teal-600, #0d9488);
  color: #fff;
  transition: opacity 0.15s;
}

.save-contact-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-contact-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.cancel-contact-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: var(--ink-500);
}

.cancel-contact-btn:hover {
  color: var(--ink-900);
}
</style>
