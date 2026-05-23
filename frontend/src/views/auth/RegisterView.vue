<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import FormProgressBar from '@/components/FormProgressBar.vue'
import ValidationIndicator from '@/components/ValidationIndicator.vue'
import TrustBadge from '@/components/TrustBadge.vue'
import AuthHeroCard from '@/components/AuthHeroCard.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'

const router = useRouter()
const auth   = useAuthStore()
const i18n   = useI18nStore()

const form = ref({
  clinic_name:      '',
  clinic_phone:     '',
  clinic_city:      '',
  clinic_address:   '',
  owner_first_name: '',
  owner_last_name:  '',
  owner_email:      '',
  owner_username:   '',
  owner_password:   '',
})

const confirmPassword = ref('')
const error           = ref('')
const submitting      = ref(false)

// Progress tracking - simple 2-step: clinic info, then owner account
const currentStep = computed(() => {
  const hasClinicInfo = form.value.clinic_name && form.value.clinic_phone
  const hasOwnerInfo = form.value.owner_email && form.value.owner_username && form.value.owner_password
  if (!hasClinicInfo) return 1
  if (!hasOwnerInfo) return 1
  return 2
})

// Field validation states
const emailValid = computed(() => {
  if (!form.value.owner_email) return 'idle'
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(form.value.owner_email) ? 'valid' : 'invalid'
})

const usernameValid = computed(() => {
  if (!form.value.owner_username) return 'idle'
  return form.value.owner_username.length >= 3 ? 'valid' : 'invalid'
})

const passwordStrength = computed(() => {
  const pwd = form.value.owner_password
  if (!pwd) return { strength: 0, label: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  return { strength: score, label: labels[score - 1] || 'Weak' }
})

const passwordValid = computed(() => {
  if (!form.value.owner_password) return 'idle'
  return form.value.owner_password.length >= 5 ? 'valid' : 'invalid'
})

const confirmValid = computed(() => {
  if (!confirmPassword.value) return 'idle'
  return confirmPassword.value === form.value.owner_password ? 'valid' : 'invalid'
})

async function submit() {
  if (form.value.owner_password !== confirmPassword.value) {
    error.value = ar('Passwords do not match.', 'كلمتا المرور غير متطابقتين.')
    return
  }
  if (!form.value.clinic_phone) {
    error.value = ar('Phone number is required.', 'رقم الهاتف مطلوب.')
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await auth.register(form.value)
    router.push('/verify-email')
  } catch (e) {
    error.value = e.response?.data?.error || 'Registration failed.'
  } finally {
    submitting.value = false
  }
}

const previewSteps = [
  {
    n: '01',
    icon: 'Globe',
    labelEn: 'Tell us about your clinic',
    labelAr: 'أخبرنا عن عيادتك',
    descEn: 'Location & working hours',
    descAr: 'الموقع وساعات العمل'
  },
  {
    n: '02',
    icon: 'TrendingUp',
    labelEn: 'Enter your costs',
    labelAr: 'أدخل تكاليفك',
    descEn: 'Rent, salaries & equipment',
    descAr: 'الإيجار والرواتب والمعدات'
  },
  {
    n: '03',
    icon: 'Sparkles',
    labelEn: 'Get instant pricing',
    labelAr: 'احصل على الأسعار فوراً',
    descEn: 'See your profitable prices',
    descAr: 'شاهد أسعارك المربحة'
  },
]

const ar = (en, arText) => i18n.locale === 'ar' ? arText : en
</script>

<template>
  <div class="reg-screen">
    <!-- LEFT: Form -->
    <div class="form-panel">
      <div class="form-header">
        <DpcLogo />
        <LangSwitch />
      </div>

      <h2 class="dpc-h reg-title">{{ ar('Create your clinic', 'أنشئ عيادتك') }}</h2>
      <p class="reg-sub">
        <span class="free-badge"><DpcIcon name="Sparkles" :size="12" :stroke-width="2" /> {{ ar('Free', 'مجاني') }}</span>
        <span class="card-badge"><DpcIcon name="CreditCard" :size="12" :stroke-width="2" /> {{ ar('No card required', 'لا بطاقة مطلوبة') }}</span>
      </p>

      <!-- Progress Bar -->
      <FormProgressBar
        :current-step="currentStep"
        :total-steps="2"
        :labels="[ar('Clinic Info', 'بيانات العيادة'), ar('Your Account', 'حسابك')]"
      />

      <div v-if="error" class="error-box">
        <DpcIcon name="AlertCircle" :size="15" :stroke-width="2" />
        {{ error }}
      </div>

      <form class="fields" @submit.prevent="submit" novalidate>

        <!-- ── Section 1: Clinic Information ── -->
        <div class="section-eyebrow">
          <DpcIcon name="Building2" :size="11" :stroke-width="2" />
          {{ ar('Clinic Information', 'بيانات العيادة') }}
        </div>

        <div class="form-group">
          <label class="form-label required">{{ ar('Clinic name', 'اسم العيادة') }}</label>
          <div class="input-wrap">
            <DpcIcon name="Building2" :size="15" class="input-icon" />
            <input
              v-model="form.clinic_name"
              class="form-input has-icon"
              :placeholder="ar('e.g. Cairo Dental Center', 'مثال: مركز القاهرة للأسنان')"
              dir="auto"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">{{ ar('Phone number', 'رقم الهاتف') }}</label>
          <div class="input-wrap">
            <DpcIcon name="Phone" :size="15" class="input-icon" />
            <input
              v-model="form.clinic_phone"
              type="tel"
              class="form-input has-icon"
              placeholder="+20 100 000 0000"
              dir="ltr"
              required
            />
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">{{ ar('City', 'المدينة') }}</label>
            <div class="input-wrap">
              <DpcIcon name="MapPin" :size="15" class="input-icon" />
              <input
                v-model="form.clinic_city"
                class="form-input has-icon"
                :placeholder="ar('e.g. Cairo', 'مثال: القاهرة')"
                dir="auto"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ ar('Address', 'العنوان') }}</label>
            <div class="input-wrap">
              <DpcIcon name="MapPin" :size="15" class="input-icon" />
              <input
                v-model="form.clinic_address"
                class="form-input has-icon"
                :placeholder="ar('Street address', 'عنوان الشارع')"
                dir="auto"
              />
            </div>
          </div>
        </div>

        <!-- Trust message between sections -->
        <div class="inline-trust">
          <DpcIcon name="Shield" :size="14" :stroke-width="1.8" />
          <span>{{ ar('Your data is encrypted and secure', 'بياناتك مشفرة وآمنة') }}</span>
        </div>

        <!-- ── Section 2: Owner Account ── -->
        <div class="section-eyebrow">
          <DpcIcon name="User" :size="11" :stroke-width="2" />
          {{ ar('Owner Account', 'حساب المالك') }}
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label required">{{ ar('First name', 'الاسم الأول') }}</label>
            <div class="input-wrap">
              <DpcIcon name="User" :size="15" class="input-icon" />
              <input
                v-model="form.owner_first_name"
                class="form-input has-icon"
                dir="auto"
                required
              />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">{{ ar('Last name', 'اسم العائلة') }}</label>
            <div class="input-wrap">
              <DpcIcon name="User" :size="15" class="input-icon" />
              <input
                v-model="form.owner_last_name"
                class="form-input has-icon"
                dir="auto"
                required
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">{{ ar('Email address', 'البريد الإلكتروني') }}</label>
          <div class="input-wrap">
            <DpcIcon name="Mail" :size="15" class="input-icon" />
            <input
              v-model="form.owner_email"
              type="email"
              class="form-input has-icon"
              placeholder="your@email.com"
              dir="ltr"
              required
            />
            <ValidationIndicator :status="emailValid" :message="emailValid === 'invalid' ? ar('Invalid email', 'بريد غير صحيح') : ''" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">{{ ar('Username', 'اسم المستخدم') }}</label>
          <div class="input-wrap">
            <DpcIcon name="AtSign" :size="15" class="input-icon" />
            <input
              v-model="form.owner_username"
              class="form-input has-icon"
              :placeholder="ar('Choose a username', 'اختر اسم مستخدم')"
              dir="ltr"
              autocomplete="username"
              required
            />
            <ValidationIndicator :status="usernameValid" :message="usernameValid === 'invalid' ? ar('Min 3 characters', '٣ أحرف على الأقل') : ''" />
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label required">{{ ar('Password', 'كلمة المرور') }}</label>
            <div class="input-wrap">
              <DpcIcon name="Lock" :size="15" class="input-icon" />
              <input
                v-model="form.owner_password"
                type="password"
                class="form-input has-icon"
                :placeholder="ar('Min 5 characters', '٥ أحرف على الأقل')"
                dir="ltr"
                autocomplete="new-password"
                minlength="5"
                required
              />
              <ValidationIndicator :status="passwordValid" />
            </div>
            <!-- Password strength meter -->
            <div v-if="form.owner_password" class="pwd-strength">
              <div class="pwd-bar">
                <div :class="['pwd-fill', `pwd-fill--${passwordStrength.strength}`]" :style="{ width: `${passwordStrength.strength * 25}%` }" />
              </div>
              <span class="pwd-label">{{ passwordStrength.label }}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">{{ ar('Confirm password', 'تأكيد كلمة المرور') }}</label>
            <div class="input-wrap">
              <DpcIcon name="Lock" :size="15" class="input-icon" />
              <input
                v-model="confirmPassword"
                type="password"
                class="form-input has-icon"
                :class="confirmPassword && confirmPassword !== form.owner_password ? 'input-error' : ''"
                :placeholder="ar('Repeat password', 'أعد كتابة كلمة المرور')"
                dir="ltr"
                autocomplete="new-password"
                required
              />
              <ValidationIndicator :status="confirmValid" :message="confirmValid === 'invalid' ? ar('Passwords do not match', 'كلمتا المرور غير متطابقتين') : ''" />
            </div>
            <p v-if="confirmPassword && confirmPassword !== form.owner_password" class="field-error">
              {{ ar('Passwords do not match', 'كلمتا المرور غير متطابقتين') }}
            </p>
          </div>
        </div>

        <!-- Submit -->
        <DpcBtn
          type="submit"
          variant="teal"
          size="lg"
          :trailing-icon="i18n.locale === 'ar' ? 'ArrowLeft' : 'ArrowRight'"
          :loading="submitting"
          :full="true"
          style="margin-top:8px;"
        >
          {{ ar('Create free clinic account', 'إنشاء حساب عيادتي مجاناً') }}
        </DpcBtn>

        <!-- Footer -->
        <div class="form-footer">
          <!-- Trust badges -->
          <div class="trust-badges">
            <TrustBadge icon="Lock" :label="ar('SSL Encrypted', 'مشفر SSL')" size="sm" />
            <TrustBadge icon="Shield" :label="ar('Bank-level security', 'أمان بنكي')" size="sm" />
            <TrustBadge icon="Check" :label="ar('GDPR Compliant', 'متوافق GDPR')" size="sm" />
          </div>

          <p>{{ ar('Already have an account?', 'لديك حساب بالفعل؟') }}
            <router-link to="/login">{{ ar('Sign in', 'تسجيل الدخول') }}</router-link>
          </p>
        </div>
      </form>
    </div>

    <!-- RIGHT: Navy hero -->
    <div class="hero dpc-hero-dots">
      <div class="glow-teal" />
      <div class="glow-navy" />
      <div class="hero-inner">
        <!-- Floating stat card -->
        <AuthHeroCard
          variant="stat"
          icon="Users"
          title="312+"
          :content="ar('Clinics already using DPC', 'عيادة تستخدم المنصة')"
          :delay="200"
        />

        <span class="eyebrow-mono">{{ ar('SETUP WIZARD', 'معالج الإعداد') }}</span>
        <h1 class="dpc-h hero-title">
          {{ ar('Ready in 3 quick steps', 'جاهز في ٣ خطوات سريعة') }}
        </h1>
        <div class="step-cards">
          <div v-for="s in previewSteps" :key="s.n" class="step-card">
            <div class="step-icon">
              <DpcIcon :name="s.icon" :size="18" :stroke-width="1.7" />
            </div>
            <div class="step-meta">
              <div class="step-n">{{ s.n }}</div>
              <div class="step-label">{{ i18n.locale === 'ar' ? s.labelAr : s.labelEn }}</div>
              <div class="step-desc">{{ i18n.locale === 'ar' ? s.descAr : s.descEn }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reg-screen { display: flex; height: 100vh; width: 100%; overflow: hidden; }

/* ── Left form panel ── */
.form-panel {
  width: 560px;
  flex: none;
  background: var(--surface);
  padding: 36px 48px 36px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.reg-title { font-size: 32px; margin-bottom: 8px; }
.reg-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.free-badge, .card-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11.5px;
  font-weight: 600;
}
.free-badge {
  background: var(--teal-50);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1px var(--teal-100);
}
.card-badge {
  background: var(--paper-2);
  color: var(--ink-600);
  box-shadow: inset 0 0 0 1px var(--line);
}

.error-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--danger-50); color: var(--danger-700);
  border: 1px solid var(--danger-100);
  padding: 10px 14px; border-radius: 10px;
  font-size: 13px; margin-bottom: 16px;
}

/* Premium section eyebrow - defined in tokens.css but needs margin */
.section-eyebrow {
  margin: 24px 0 16px;
}

/* Inline trust message between sections */
.inline-trust {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--success-50);
  color: var(--success-700);
  font-size: 12.5px;
  font-weight: 500;
  margin: 20px 0 24px;
  border: 1px solid var(--success-100);
}

/* Fields */
.fields { display: flex; flex-direction: column; gap: 0; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-group { margin-bottom: 12px; }

.form-label {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-700);
  margin-bottom: 5px;
  letter-spacing: 0.01em;
}
.form-label.required::after { content: ' *'; color: var(--danger-600); }

/* Input with icon */
.input-wrap { position: relative; }
.input-icon {
  position: absolute;
  inset-inline-start: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-400);
  pointer-events: none;
}
.form-input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  font-size: 13.5px;
  background: var(--paper);
  color: var(--ink-900);
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
  outline: none;
}
.form-input.has-icon { padding-inline-start: 36px; }
.form-input::placeholder { color: var(--ink-300); }
.form-input:hover  { border-color: var(--ink-300); }
.form-input:focus  {
  border-color: var(--teal-600);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgba(13,148,136,.10);
}
.form-input.input-error { border-color: var(--danger-500); }
.form-input.input-error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,.10); }
.field-error { font-size: 11.5px; color: var(--danger-600); margin-top: 4px; }

/* Password strength meter */
.pwd-strength {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.pwd-bar {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--line);
  overflow: hidden;
}
.pwd-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s var(--ease-spring), background 0.3s;
}
.pwd-fill--1 { background: var(--danger-500); }
.pwd-fill--2 { background: var(--warning-500); }
.pwd-fill--3 { background: var(--teal-500); }
.pwd-fill--4 { background: var(--success-600); }
.pwd-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-500);
  min-width: 42px;
}

/* Footer */
.form-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.trust-badges {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.form-footer p { font-size: 13px; color: var(--ink-500); margin: 0; }
.form-footer a  { color: var(--teal-700); font-weight: 600; }

/* ── Right hero ── */
.hero {
  flex: 1;
  position: relative;
  background: linear-gradient(165deg, #0a1424 0%, #0f2545 60%, #163058 100%);
  color: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.hero-inner { position: relative; z-index: 1; padding: 56px; }
.hero-title  { font-size: 36px; line-height: 1.15; color: #fff; margin: 14px 0 36px; max-width: 420px; }

.glow-teal {
  position: absolute; width: 540px; height: 540px; border-radius: 50%;
  background: radial-gradient(circle, rgba(13,148,136,.32) 0%, transparent 60%);
  bottom: -240px; inset-inline-end: -180px; filter: blur(8px); pointer-events: none;
}
.glow-navy {
  position: absolute; width: 380px; height: 380px; border-radius: 50%;
  background: radial-gradient(circle, rgba(75,115,165,.22) 0%, transparent 60%);
  top: -160px; inset-inline-start: -120px; pointer-events: none;
}
.eyebrow-mono {
  font-family: var(--font-mono);
  font-size: 11px; letter-spacing: .12em;
  color: rgba(255,255,255,.5); text-transform: uppercase;
}
.step-cards { display: flex; flex-direction: column; gap: 12px; }
.step-card {
  display: flex; align-items: center; gap: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px;
  padding: 14px 16px;
}
.step-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(94,224,185,.14); color: #5ee0b9;
  display: grid; place-items: center; flex: none;
}
.step-meta  { display: flex; flex-direction: column; gap: 2px; }
.step-n     { font-family: var(--font-mono); font-size: 11px; color: rgba(255,255,255,.5); letter-spacing: .08em; }
.step-label { font-size: 14.5px; color: #fff; font-weight: 600; }
.step-desc  { font-size: 12px; color: rgba(255,255,255,.65); font-weight: 400; }
</style>
