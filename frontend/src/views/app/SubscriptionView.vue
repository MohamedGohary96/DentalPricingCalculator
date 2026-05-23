<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import PageHeader from '@/components/PageHeader.vue'
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

const contactInfo = ref({
  contact_email: '',
  contact_phone: '+201015755890',
  contact_whatsapp: '+201015755890'
})

const contactEmail = computed(() => {
  const key = isAr.value ? 'contact_email_ar' : 'contact_email'
  return contactInfo.value[key] || contactInfo.value.contact_email
})

const contactPhone = computed(() => {
  const key = isAr.value ? 'contact_phone_ar' : 'contact_phone'
  return contactInfo.value[key] || contactInfo.value.contact_phone || '+201015755890'
})

const contactWhatsApp = computed(() => {
  const key = isAr.value ? 'contact_whatsapp_ar' : 'contact_whatsapp'
  return contactInfo.value[key] || contactInfo.value.contact_whatsapp || contactPhone.value
})

const trialTimePct     = computed(() => Math.max(0, Math.min(100, (trialDaysLeft.value / 7) * 100)))
const trialServicesPct = computed(() => maxTrialServices.value > 0 ? Math.min(100, (servicesUsed.value / maxTrialServices.value) * 100) : 0)

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }

onMounted(async () => {
  try {
    // Fetch subscription status
    const { data: subData } = await axios.get('/api/subscription/status', { withCredentials: true })
    sub.value = subData || {}

    // Fetch contact info (public endpoint, cached)
    const { data: contactData } = await axios.get('/api/contact-info')
    contactInfo.value = contactData || {}
  } catch {
    // Use auth store subscription if available
    sub.value = auth.user?.subscription || {}
  }
})
</script>

<template>
  <AppShell active-key="subscription">
    <!-- Premium page header -->
    <PageHeader
      :title="isAr ? 'الاشتراك' : 'Subscription'"
      :subtitle="isAr ? 'حالة اشتراكك وتفاصيل الخطة.' : 'Your subscription status and plan details.'"
      icon="CreditCard"
    >
      <template #actions>
        <LangSwitch />
      </template>
    </PageHeader>

    <div class="sub-body">
      <!-- Premium status card with animation -->
      <div
        class="status-card animate-fade-in-up"
        style="animation-delay: var(--stagger-1);"
        :style="{ background: config.bg, boxShadow: `inset 0 0 0 2px ${config.color}20, 0 4px 12px ${config.color}10` }"
      >
        <div class="status-icon" :style="{ background: config.bg, boxShadow: `inset 0 0 0 1.5px ${config.color}30`, color: config.color }">
          <DpcIcon :name="config.icon" :size="24" :stroke-width="1.7" />
        </div>
        <div class="status-info">
          <div class="status-label" :style="{ color: config.color }">{{ config.label }}</div>
          <div class="status-message">{{ config.message }}</div>
        </div>
        <div class="status-actions" v-if="currentStatus !== 'active'">
          <div class="status-quick-actions">
            <!-- Upgrade/Renew primary -->
            <a
              :href="`https://wa.me/${contactWhatsApp.replace(/\D/g,'')}`"
              target="_blank"
              rel="noopener"
              class="status-action-icon status-action-primary"
              :title="currentStatus === 'trial' ? (isAr ? 'ترقية الآن' : 'Upgrade now') : (isAr ? 'تجديد' : 'Renew')"
            >
              <DpcIcon :name="currentStatus === 'trial' ? 'Zap' : 'RefreshCw'" :size="18" :stroke-width="2" />
            </a>

            <!-- WhatsApp -->
            <a
              :href="`https://wa.me/${contactWhatsApp.replace(/\D/g,'')}`"
              target="_blank"
              rel="noopener"
              class="status-action-icon"
              :title="isAr ? 'واتساب' : 'WhatsApp'"
            >
              <DpcIcon name="WhatsApp" :size="18" :stroke-width="2" />
            </a>

            <!-- Phone -->
            <a
              v-if="contactPhone"
              :href="`tel:${contactPhone}`"
              class="status-action-icon"
              :title="isAr ? 'اتصل' : 'Call'"
            >
              <DpcIcon name="PhoneCall" :size="18" :stroke-width="2" />
            </a>

            <!-- Email -->
            <a
              v-if="contactEmail"
              :href="`mailto:${contactEmail}`"
              class="status-action-icon"
              :title="isAr ? 'إيميل' : 'Email'"
            >
              <DpcIcon name="Mail" :size="18" :stroke-width="2" />
            </a>
          </div>
        </div>
      </div>

      <!-- Premium trial progress with animations -->
      <div
        v-if="currentStatus === 'trial'"
        class="dpc-panel trial-card animate-fade-in-up"
        style="animation-delay: var(--stagger-2);"
      >
        <div class="mini-eyebrow">
          <DpcIcon name="Clock" :size="11" :stroke-width="2" />
          {{ isAr ? 'تقدم التجربة' : 'Trial progress' }}
        </div>
        <div class="trial-grid">
          <div>
            <div class="trial-row-label">{{ isAr ? 'الوقت المتبقي' : 'Time remaining' }}</div>
            <div class="progress-track">
              <div class="progress-fill progress-fill-warning" :style="{ width: trialTimePct + '%' }" />
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

      <!-- Days remaining with premium styling -->
      <div
        v-if="(currentStatus === 'active' || currentStatus === 'warning') && !isPermanent"
        class="dpc-panel days-card animate-fade-in-up"
        style="animation-delay: var(--stagger-2);"
      >
        <div class="days-icon" :style="{ color: currentStatus === 'warning' ? 'var(--warning-700)' : 'var(--teal-700)' }">
          <DpcIcon name="Calendar" :size="32" :stroke-width="1.5" />
        </div>
        <div class="days-number dpc-num" :style="{ color: currentStatus === 'warning' ? 'var(--warning-700)' : 'var(--teal-700)' }">
          {{ daysRemaining }}
        </div>
        <div class="days-label">{{ isAr ? 'يوماً حتى التجديد' : 'Days until renewal' }}</div>
      </div>

      <!-- Premium details grid -->
      <div class="dpc-panel details-card animate-fade-in-up" style="animation-delay: var(--stagger-3);">
        <div class="mini-eyebrow" style="margin-bottom:16px;">
          <DpcIcon name="FileText" :size="11" :stroke-width="2" />
          {{ isAr ? 'تفاصيل الاشتراك' : 'Subscription details' }}
        </div>
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

      <!-- Premium features with stagger animation -->
      <div class="dpc-panel features-card animate-fade-in-up" style="animation-delay: var(--stagger-4);">
        <div class="mini-eyebrow" style="margin-bottom:16px;">
          <DpcIcon name="Sparkles" :size="11" :stroke-width="2" />
          {{ isAr ? 'ما يشمله اشتراكك' : "What's included" }}
        </div>
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

      <!-- Ultra-premium contact card -->
      <div class="contact-card animate-fade-in-up" style="animation-delay: var(--stagger-5);">
        <div class="contact-bg-pattern"></div>
        <div class="contact-bg-glow"></div>
        <div class="contact-bg-glow-2"></div>

        <div class="contact-header">
          <div class="contact-icon-badge">
            <DpcIcon name="Headphones" :size="24" :stroke-width="1.5" />
          </div>
          <div class="contact-header-text">
            <div class="contact-title">{{ isAr ? 'تواصل معنا' : 'Contact support' }}</div>
            <div class="contact-subtitle">{{ isAr ? 'للترقية أو الاستفسار عن اشتراكك.' : 'To upgrade or ask about your subscription.' }}</div>
          </div>
        </div>

        <div class="contact-methods">
          <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="contact-method-card">
            <div class="contact-method-icon">
              <DpcIcon name="Mail" :size="20" :stroke-width="1.8" />
            </div>
            <div class="contact-method-content">
              <div class="contact-method-label">{{ isAr ? 'راسلنا' : 'Email us' }}</div>
              <div class="contact-method-value">{{ contactEmail }}</div>
            </div>
            <div class="contact-method-arrow">
              <DpcIcon name="ArrowRight" :size="16" :stroke-width="2" />
            </div>
          </a>

          <a v-if="contactPhone" :href="`tel:${contactPhone}`" class="contact-method-card">
            <div class="contact-method-icon">
              <DpcIcon name="PhoneCall" :size="20" :stroke-width="1.8" />
            </div>
            <div class="contact-method-content">
              <div class="contact-method-label">{{ isAr ? 'اتصل بنا' : 'Call us' }}</div>
              <div class="contact-method-value">{{ contactPhone }}</div>
            </div>
            <div class="contact-method-arrow">
              <DpcIcon name="ArrowRight" :size="16" :stroke-width="2" />
            </div>
          </a>

          <a v-if="contactWhatsApp" :href="`https://wa.me/${contactWhatsApp.replace(/\D/g,'')}`" target="_blank" rel="noopener" class="contact-method-card contact-method-featured">
            <div class="contact-method-icon">
              <DpcIcon name="WhatsApp" :size="20" :stroke-width="1.8" />
            </div>
            <div class="contact-method-content">
              <div class="contact-method-label">WhatsApp</div>
              <div class="contact-method-value">{{ contactWhatsApp }}</div>
            </div>
            <div class="contact-method-arrow">
              <DpcIcon name="ArrowRight" :size="16" :stroke-width="2" />
            </div>
          </a>

          <div v-if="!contactPhone && !contactEmail && !contactWhatsApp" class="contact-fallback">
            <DpcIcon name="AlertCircle" :size="20" :stroke-width="1.8" style="opacity: 0.4;" />
            <span>{{ isAr ? 'تواصل مع المسؤول' : 'Contact your admin' }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
/* Premium animations */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) backwards;
}

.sub-body {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 900px;
}

/* Premium status card */
.status-card {
  padding: 24px 28px;
  border-radius: var(--radius-lg, 16px);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all var(--duration-normal, 0.3s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  position: relative;
  overflow: hidden;
}

.status-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 50%, currentColor, transparent 60%);
  opacity: 0.03;
  pointer-events: none;
}

.status-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md, 12px);
  flex: none;
  display: grid;
  place-items: center;
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}

.status-card:hover .status-icon {
  transform: scale(1.05) rotate(2deg);
}

.status-info { flex: 1; }
.status-label {
  font-size: 22px;
  font-weight: 700;
  font-family: var(--font-head, inherit);
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}
.status-message {
  font-size: 14px;
  color: var(--ink-600);
  line-height: 1.5;
}
.status-actions { flex: none; }

/* Status quick action icons */
.status-quick-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.status-action-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm, 8px);
  background: var(--paper);
  border: 1px solid var(--ink-200);
  display: grid;
  place-items: center;
  color: var(--ink-700);
  text-decoration: none;
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  flex: none;
}

.status-action-icon:hover {
  transform: translateY(-2px);
  background: var(--teal-50);
  border-color: var(--teal-300);
  color: var(--teal-700);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15);
}

.status-action-icon:active {
  transform: translateY(0);
}

/* Primary action icon (Upgrade/Renew) */
.status-action-primary {
  background: linear-gradient(135deg, var(--teal-500), var(--teal-600));
  border-color: var(--teal-600);
  color: #fff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
}

.status-action-primary:hover {
  background: linear-gradient(135deg, var(--teal-400), var(--teal-500));
  border-color: var(--teal-500);
  color: #fff;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
}

/* Premium trial card */
.trial-card {
  padding: 24px;
}

.mini-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--teal-700);
  margin-bottom: 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full, 999px);
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1px var(--teal-100);
}

.trial-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-top: 20px;
}

.trial-row-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-700);
  margin-bottom: 10px;
}

.trial-row-sub {
  font-size: 12.5px;
  color: var(--ink-600);
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}

.progress-track {
  height: 10px;
  background: var(--surface);
  border-radius: var(--radius-full, 999px);
  box-shadow: inset 0 0 0 1px var(--line);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full, 999px);
  transition: width 0.6s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-fill-warning {
  background: linear-gradient(90deg, var(--warning-500, #f59e0b), var(--warning-600, #d97706));
}

.progress-fill-teal {
  background: linear-gradient(90deg, var(--teal-500), var(--teal-600));
}

/* Premium days card */
.days-card {
  padding: 32px 28px;
  text-align: center;
  background: linear-gradient(135deg, var(--paper) 0%, var(--surface) 100%);
  position: relative;
  overflow: hidden;
}

.days-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, currentColor, transparent 70%);
  opacity: 0.02;
  pointer-events: none;
}

.days-icon {
  margin: 0 auto 16px;
  opacity: 0.6;
}

.days-number {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 12px;
  font-variant-numeric: tabular-nums;
}

.days-label {
  font-size: 14px;
  color: var(--ink-500);
  font-weight: 500;
}

/* Premium details card */
.details-card {
  padding: 24px;
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: var(--radius-md, 10px);
  background: var(--surface);
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}

.detail-row:hover {
  background: var(--paper-2);
  transform: translateX(2px);
}

.detail-key {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-500);
}

.detail-val {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-900);
}

.badge-teal,
.badge-warning,
.badge-danger {
  padding: 4px 12px;
  border-radius: var(--radius-full, 999px);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: inset 0 0 0 1px currentColor;
  opacity: 0.95;
}

.badge-teal {
  background: var(--teal-50);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1px var(--teal-200);
}

.badge-warning {
  background: var(--warning-50);
  color: var(--warning-700);
  box-shadow: inset 0 0 0 1px var(--warning-200);
}

.badge-danger {
  background: var(--danger-50);
  color: var(--danger-700);
  box-shadow: inset 0 0 0 1px var(--danger-200);
}

/* Premium features card */
.features-card {
  padding: 24px;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-md, 10px);
  background: var(--surface);
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}

.feature-item:hover {
  background: var(--paper-2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.08);
}

.feat-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm, 8px);
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  flex: none;
  box-shadow: inset 0 0 0 1px var(--teal-100);
}

.feat-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-900);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.feat-sub {
  font-size: 12px;
  color: var(--ink-500);
  line-height: 1.4;
}

/* Ultra-premium contact card */
.contact-card {
  border-radius: var(--radius-lg, 16px);
  background: linear-gradient(135deg, #0a1424 0%, #0f2545 50%, #0a1424 100%);
  padding: 36px 32px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(10, 20, 36, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

/* Animated background pattern */
.contact-bg-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 20px,
    rgba(255, 255, 255, 0.03) 20px,
    rgba(255, 255, 255, 0.03) 40px
  );
  pointer-events: none;
}

.contact-bg-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.18), transparent 70%);
  pointer-events: none;
  animation: pulse-glow 4s ease-in-out infinite;
}

.contact-bg-glow-2 {
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.12), transparent 70%);
  pointer-events: none;
  animation: pulse-glow 4.5s ease-in-out infinite reverse;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.15); }
}

/* Header section */
.contact-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}

.contact-icon-badge {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md, 10px);
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.25);
  display: grid;
  place-items: center;
  color: var(--teal-400);
  flex: none;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.15);
}

.contact-header-text {
  flex: 1;
}

.contact-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.contact-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.5;
}

/* Contact methods grid */
.contact-methods {
  display: grid;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.contact-method-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: var(--radius-md, 10px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  transition: all var(--duration-base, 0.3s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  cursor: pointer;
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.contact-method-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent);
  opacity: 0;
  transition: opacity var(--duration-base, 0.3s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}

.contact-method-card:hover::before {
  opacity: 1;
}

.contact-method-card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.contact-method-card:active {
  transform: translateY(-1px);
}

/* Featured method (WhatsApp) */
.contact-method-featured {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(20, 184, 166, 0.08));
  border-color: rgba(20, 184, 166, 0.25);
  box-shadow: 0 4px 16px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(20, 184, 166, 0.1) inset;
}

.contact-method-featured:hover {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(20, 184, 166, 0.12));
  border-color: rgba(20, 184, 166, 0.35);
  box-shadow: 0 8px 28px rgba(20, 184, 166, 0.25), 0 0 0 1px rgba(20, 184, 166, 0.15) inset;
}

.contact-method-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm, 8px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.9);
  flex: none;
}

.contact-method-featured .contact-method-icon {
  background: rgba(20, 184, 166, 0.15);
  border-color: rgba(20, 184, 166, 0.3);
  color: var(--teal-300);
}

.contact-method-content {
  flex: 1;
  min-width: 0;
}

.contact-method-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 3px;
  letter-spacing: -0.005em;
}

.contact-method-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-method-arrow {
  color: rgba(255, 255, 255, 0.4);
  transition: all var(--duration-fast, 0.2s) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  flex: none;
}

.contact-method-card:hover .contact-method-arrow {
  color: rgba(255, 255, 255, 0.7);
  transform: translateX(3px);
}

.contact-method-featured .contact-method-arrow {
  color: var(--teal-400);
}

/* Fallback message */
.contact-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .trial-grid,
  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .contact-card {
    padding: 28px 24px;
  }

  .contact-header {
    flex-direction: row;
    gap: 14px;
  }

  .contact-icon-badge {
    width: 44px;
    height: 44px;
  }

  .contact-title {
    font-size: 20px;
  }

  .contact-methods {
    gap: 10px;
  }

  .contact-method-card {
    padding: 16px 18px;
  }

  .contact-method-value {
    font-size: 11px;
  }

  .status-card {
    flex-direction: column;
    text-align: center;
  }

  .status-actions {
    width: 100%;
  }

  .status-quick-actions {
    justify-content: center;
  }

  .status-action-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
