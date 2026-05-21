<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const auth  = useAuthStore()
const i18n  = useI18nStore()
const isAr  = computed(() => i18n.locale === 'ar')
const sub   = ref({})

const statusConfig = computed(() => ({
  active: {
    icon: 'CheckCircle', color: 'var(--teal-700)', bg: 'var(--teal-50)',
    label: isAr.value ? 'نشط' : 'Active',
    message: isAr.value ? 'اشتراكك نشط. استمتع بالوصول الكامل.' : 'Your subscription is active. Enjoy full access.',
  },
  trial: {
    icon: 'Clock', color: 'var(--warning-700)', bg: 'var(--warning-50)',
    label: isAr.value ? 'تجريبي' : 'Trial',
    message: isAr.value ? 'أنت في الفترة التجريبية.' : 'You are in the trial period.',
  },
  warning: {
    icon: 'AlertCircle', color: 'var(--warning-700)', bg: 'var(--warning-50)',
    label: isAr.value ? 'ينتهي قريباً' : 'Expiring soon',
    message: isAr.value ? 'اشتراكك على وشك الانتهاء.' : 'Your subscription is about to expire.',
  },
  grace_period: {
    icon: 'AlertTriangle', color: 'var(--danger-700)', bg: 'var(--danger-50)',
    label: isAr.value ? 'فترة السماح' : 'Grace period',
    message: isAr.value ? 'انتهى اشتراكك. لديك فترة سماح.' : 'Subscription ended. You have a grace period.',
  },
  expired: {
    icon: 'Lock', color: 'var(--danger-700)', bg: 'var(--danger-50)',
    label: isAr.value ? 'منتهٍ' : 'Expired',
    message: isAr.value ? 'انتهى اشتراكك. يرجى التجديد.' : 'Your subscription has expired. Please renew.',
  },
  suspended: {
    icon: 'PauseCircle', color: 'var(--ink-500)', bg: 'var(--paper-2)',
    label: isAr.value ? 'موقوف' : 'Suspended',
    message: isAr.value ? 'حسابك موقوف. تواصل مع الدعم.' : 'Your account is suspended. Contact support.',
  },
}))

const currentStatus = computed(() => {
  if (sub.value.is_suspended) return 'suspended'
  return sub.value.status || 'trial'
})

const config = computed(() => statusConfig.value[currentStatus.value] || statusConfig.value.trial)

const trialDaysLeft    = computed(() => sub.value.trial_days_remaining || 0)
const servicesUsed     = computed(() => sub.value.services_used        || 0)
const maxTrialServices = computed(() => sub.value.max_trial_services   || 2)
const daysRemaining    = computed(() => sub.value.days_remaining       || 0)
const isPermanent      = computed(() => !!sub.value.is_permanent)

const expiryText = computed(() => {
  if (isPermanent.value) return isAr.value ? 'لا ينتهي أبداً' : 'Never expires'
  if (sub.value.expires_at) {
    return new Date(sub.value.expires_at).toLocaleDateString(
      isAr.value ? 'ar-EG' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    )
  }
  if (currentStatus.value === 'trial') {
    return trialDaysLeft.value > 0
      ? (isAr.value ? `${trialDaysLeft.value} أيام متبقية` : `${trialDaysLeft.value} days left`)
      : (isAr.value ? 'انتهت التجربة' : 'Trial ended')
  }
  return '—'
})

const clinicName = computed(() => auth.user?.clinic_name || '—')
const contactPhone = computed(() => sub.value.contact_phone || '')

const trialTimePct     = computed(() => Math.max(0, Math.min(100, (trialDaysLeft.value / 7) * 100)))
const trialServicesPct = computed(() => maxTrialServices.value > 0 ? Math.min(100, (servicesUsed.value / maxTrialServices.value) * 100) : 0)

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/subscription/status', { withCredentials: true })
    sub.value = data || {}
  } catch {
    // Use auth store subscription if available
    sub.value = auth.user?.subscription || {}
  }
})
</script>

<template>
  <AppShell active-key="subscription">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="dpc-h page-title">{{ isAr ? 'الاشتراك' : 'Subscription' }}</h1>
        <p class="page-sub">{{ isAr ? 'حالة اشتراكك وتفاصيل الخطة.' : 'Your subscription status and plan details.' }}</p>
      </div>
      <LangSwitch />
    </div>

    <div class="sub-body">
      <!-- Status card -->
      <div class="status-card" :style="{ background: config.bg, boxShadow: `inset 0 0 0 2px ${config.color}20` }">
        <div class="status-icon" :style="{ background: config.bg, boxShadow: `inset 0 0 0 1.5px ${config.color}30`, color: config.color }">
          <DpcIcon :name="config.icon" :size="22" :stroke-width="1.8" />
        </div>
        <div class="status-info">
          <div class="status-label" :style="{ color: config.color }">{{ config.label }}</div>
          <div class="status-message">{{ config.message }}</div>
        </div>
        <div class="status-actions" v-if="currentStatus !== 'active'">
          <a href="mailto:support@dentalpricecalculator.com" class="dpc-btn dpc-btn-teal">
            {{ isAr ? 'تواصل معنا' : 'Contact us' }}
            <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="14" :stroke-width="2" />
          </a>
        </div>
      </div>

      <!-- Trial progress bars -->
      <div v-if="currentStatus === 'trial'" class="dpc-panel trial-card">
        <div class="mini-eyebrow">{{ isAr ? 'تقدم التجربة' : 'Trial progress' }}</div>
        <div class="trial-grid">
          <div>
            <div class="trial-row-label">{{ isAr ? 'الوقت المتبقي' : 'Time remaining' }}</div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: trialTimePct + '%' }" />
            </div>
            <div class="trial-row-sub">{{ isAr ? `${trialDaysLeft} أيام متبقية من 7` : `${trialDaysLeft} of 7 days left` }}</div>
          </div>
          <div>
            <div class="trial-row-label">{{ isAr ? 'الخدمات المستخدمة' : 'Services used' }}</div>
            <div class="progress-track">
              <div class="progress-fill progress-fill-teal" :style="{ width: trialServicesPct + '%' }" />
            </div>
            <div class="trial-row-sub">{{ isAr ? `${servicesUsed} من ${maxTrialServices} خدمات` : `${servicesUsed} of ${maxTrialServices} services` }}</div>
          </div>
        </div>
      </div>

      <!-- Days remaining (active/warning, not permanent) -->
      <div v-if="(currentStatus === 'active' || currentStatus === 'warning') && !isPermanent" class="dpc-panel days-card">
        <div class="days-number dpc-num" :style="{ color: currentStatus === 'warning' ? 'var(--warning-700)' : 'var(--teal-700)' }">
          {{ daysRemaining }}
        </div>
        <div class="days-label">{{ isAr ? 'يوماً حتى التجديد' : 'Days until renewal' }}</div>
      </div>

      <!-- Details grid -->
      <div class="dpc-panel details-card">
        <div class="mini-eyebrow" style="margin-bottom:16px;">{{ isAr ? 'تفاصيل الاشتراك' : 'Subscription details' }}</div>
        <div class="details-grid">
          <div class="detail-row">
            <span class="detail-key">{{ isAr ? 'اسم العيادة' : 'Clinic name' }}</span>
            <span class="detail-val">{{ clinicName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-key">{{ isAr ? 'الخطة' : 'Plan' }}</span>
            <span class="detail-val">
              <span v-if="currentStatus === 'trial'" class="badge-warning">{{ isAr ? 'تجريبي' : 'Trial' }}</span>
              <span v-else-if="currentStatus === 'active'" class="badge-teal">{{ isAr ? 'نشط' : 'Active' }}</span>
              <span v-else class="badge-danger">{{ isAr ? 'غير نشط' : 'Inactive' }}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-key">{{ isAr ? 'تاريخ الانتهاء' : 'Expiry' }}</span>
            <span class="detail-val">{{ expiryText }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-key">{{ isAr ? 'الحالة' : 'Status' }}</span>
            <span class="detail-val" :style="{ color: config.color }">{{ config.label }}</span>
          </div>
        </div>
      </div>

      <!-- What's included -->
      <div class="dpc-panel features-card">
        <div class="mini-eyebrow" style="margin-bottom:16px;">{{ isAr ? 'ما يشمله اشتراكك' : "What's included" }}</div>
        <div class="features-grid">
          <div class="feature-item">
            <DpcIcon name="Stethoscope" :size="15" :stroke-width="1.7" class="feat-icon" />
            <div>
              <div class="feat-label">{{ isAr ? 'الخدمات' : 'Services' }}</div>
              <div class="feat-sub">{{ currentStatus === 'trial' ? (isAr ? `حتى ${maxTrialServices} خدمات` : `Up to ${maxTrialServices} services`) : (isAr ? 'غير محدود' : 'Unlimited') }}</div>
            </div>
          </div>
          <div class="feature-item">
            <DpcIcon name="Package" :size="15" :stroke-width="1.7" class="feat-icon" />
            <div>
              <div class="feat-label">{{ isAr ? 'المستهلكات' : 'Consumables' }}</div>
              <div class="feat-sub">{{ isAr ? 'غير محدود' : 'Unlimited' }}</div>
            </div>
          </div>
          <div class="feature-item">
            <div :style="{ opacity: currentStatus === 'trial' || currentStatus === 'expired' ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }">
              <DpcIcon name="CircleDollarSign" :size="15" :stroke-width="1.7" class="feat-icon" />
              <div>
                <div class="feat-label">{{ isAr ? 'تحليل قائمة الأسعار' : 'Price list analysis' }}</div>
                <div class="feat-sub">{{ (currentStatus === 'trial' || currentStatus === 'expired') ? (isAr ? 'مقفل' : 'Locked') : (isAr ? 'متاح' : 'Available') }}</div>
              </div>
            </div>
          </div>
          <div class="feature-item">
            <DpcIcon name="Settings" :size="15" :stroke-width="1.7" class="feat-icon" />
            <div>
              <div class="feat-label">{{ isAr ? 'إعدادات العيادة' : 'Clinic settings' }}</div>
              <div class="feat-sub">{{ isAr ? 'متاح دائماً' : 'Always available' }}</div>
            </div>
          </div>
          <div class="feature-item">
            <DpcIcon name="BarChart2" :size="15" :stroke-width="1.7" class="feat-icon" />
            <div>
              <div class="feat-label">{{ isAr ? 'متتبع الحالات' : 'Case tracker' }}</div>
              <div class="feat-sub">{{ currentStatus === 'active' ? (isAr ? 'متاح' : 'Available') : (isAr ? 'للمشتركين' : 'Subscribers only') }}</div>
            </div>
          </div>
          <div class="feature-item">
            <DpcIcon name="Globe" :size="15" :stroke-width="1.7" class="feat-icon" />
            <div>
              <div class="feat-label">{{ isAr ? 'واجهة ثنائية اللغة' : 'Bilingual interface' }}</div>
              <div class="feat-sub">{{ isAr ? 'EN / AR' : 'EN / AR' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact support -->
      <div class="contact-card">
        <div class="contact-inner">
          <div>
            <div class="dpc-h contact-title">{{ isAr ? 'تواصل معنا' : 'Contact support' }}</div>
            <div class="contact-sub">{{ isAr ? 'للترقية أو الاستفسار عن اشتراكك.' : 'To upgrade or ask about your subscription.' }}</div>
          </div>
          <div class="contact-btns">
            <a v-if="contactPhone" :href="`tel:${contactPhone}`" class="dpc-btn dpc-btn-outline contact-btn">
              <DpcIcon name="Phone" :size="14" :stroke-width="1.8" />
              {{ isAr ? 'اتصل بنا' : 'Call us' }}
            </a>
            <a v-if="contactPhone" :href="`https://wa.me/${contactPhone.replace(/\D/g,'')}`" target="_blank" rel="noopener" class="dpc-btn dpc-btn-teal contact-btn">
              <DpcIcon name="MessageCircle" :size="14" :stroke-width="1.8" />
              WhatsApp
            </a>
            <span v-if="!contactPhone" class="contact-na">{{ isAr ? 'تواصل مع المسؤول' : 'Contact your admin' }}</span>
          </div>
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
.page-sub   { color: var(--ink-500); font-size: 13.5px; margin: 0; }

.sub-body { padding: 20px 28px; display: flex; flex-direction: column; gap: 16px; max-width: 800px; }

/* Status card */
.status-card {
  padding: 20px 24px; border-radius: var(--r, 14px);
  display: flex; align-items: center; gap: 20px;
}
.status-icon {
  width: 52px; height: 52px; border-radius: 14px; flex: none;
  display: grid; place-items: center;
}
.status-info { flex: 1; }
.status-label   { font-size: 20px; font-weight: 700; font-family: var(--font-head); margin-bottom: 4px; }
.status-message { font-size: 13.5px; color: var(--ink-600); }
.status-actions { flex: none; }

/* Trial progress */
.trial-card { padding: 22px; }
.mini-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-500); margin-bottom: 14px; }
.trial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 14px; }
.trial-row-label { font-size: 12.5px; color: var(--ink-500); margin-bottom: 8px; }
.trial-row-sub   { font-size: 12.5px; color: var(--ink-600); margin-top: 6px; }
.progress-track { height: 8px; background: var(--paper-2); border-radius: 999px; box-shadow: inset 0 0 0 1px var(--line); overflow: hidden; }
.progress-fill  { height: 100%; background: var(--warning-500, #f59e0b); border-radius: 999px; transition: width .3s; }
.progress-fill-teal { background: var(--teal-600); }

/* Days remaining */
.days-card { padding: 28px; text-align: center; }
.days-number { font-size: 52px; font-weight: 700; line-height: 1; margin-bottom: 8px; }
.days-label  { font-size: 13.5px; color: var(--ink-500); }

/* Details */
.details-card { padding: 22px; }
.details-grid { display: flex; flex-direction: column; gap: 12px; }
.detail-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--line-2, #f0eeea);
}
.detail-row:last-child { border-bottom: none; }
.detail-key { font-size: 13px; color: var(--ink-500); }
.detail-val { font-size: 13.5px; font-weight: 500; color: var(--ink-900); }

.badge-teal    { padding: 3px 10px; border-radius: 999px; background: var(--teal-50);    color: var(--teal-700);    font-size: 12px; font-weight: 600; }
.badge-warning { padding: 3px 10px; border-radius: 999px; background: var(--warning-50); color: var(--warning-700); font-size: 12px; font-weight: 600; }
.badge-danger  { padding: 3px 10px; border-radius: 999px; background: var(--danger-50);  color: var(--danger-700);  font-size: 12px; font-weight: 600; }

/* Features */
.features-card { padding: 22px; }
.features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.feature-item  { display: flex; align-items: flex-start; gap: 10px; }
.feat-icon     { color: var(--teal-700); flex: none; margin-top: 2px; }
.feat-label    { font-size: 13.5px; font-weight: 500; color: var(--ink-900); }
.feat-sub      { font-size: 12px; color: var(--ink-500); }

/* Contact */
.contact-card {
  border-radius: var(--r, 14px);
  background: linear-gradient(135deg, #0a1424, #0f2545);
  padding: 22px 24px;
}
.contact-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.contact-title { font-size: 18px; color: #fff; margin-bottom: 4px; }
.contact-sub   { font-size: 13px; color: rgba(255,255,255,.65); }
.contact-btns  { display: flex; gap: 10px; flex: none; }
.contact-btn   { height: 40px; }
.contact-na    { font-size: 13px; color: rgba(255,255,255,.65); }
</style>
