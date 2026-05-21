<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcField from '@/components/DpcField.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'

const router = useRouter()
const auth   = useAuthStore()
const i18n   = useI18nStore()

const form = ref({
  clinic_name: '', first_name: '', last_name: '',
  email: '', password: '', country: 'Egypt', num_chairs: 2
})
const agreeTerms = ref(false)
const error = ref('')
const submitting = ref(false)

const chairOptions = [1, 2, '3-5', '6+']

async function submit() {
  if (!agreeTerms.value) { error.value = 'Please accept the terms.'; return }
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
  { n: '01', icon: 'Globe',            labelEn: 'Location',          labelAr: 'الموقع' },
  { n: '02', icon: 'Building2',        labelEn: 'Costs & Capacity',  labelAr: 'التكاليف والطاقة' },
  { n: '03', icon: 'CircleDollarSign', labelEn: 'Pricing defaults',  labelAr: 'إعدادات التسعير' },
]
</script>

<template>
  <div class="reg-screen">
    <!-- LEFT: Form -->
    <div class="form-panel">
      <div class="form-header">
        <DpcLogo />
        <LangSwitch />
      </div>

      <h2 class="dpc-h" style="font-size:28px;margin-bottom:8px;">
        {{ i18n.locale === 'ar' ? 'أنشئ عيادتك' : 'Create your clinic' }}
      </h2>
      <p style="color:var(--ink-500);font-size:14.5px;margin-bottom:24px;">
        {{ i18n.locale === 'ar' ? 'احصل على ملف تسعيرك المجاني في دقائق.' : 'Get your free pricing profile in minutes.' }}
      </p>

      <form class="fields" @submit.prevent="submit">
        <DpcField
          :label="i18n.locale === 'ar' ? 'اسم العيادة' : 'Clinic name'"
          icon="Building2"
          v-model="form.clinic_name"
        />
        <div class="grid-2">
          <DpcField
            :label="i18n.locale === 'ar' ? 'اسم المالك' : 'Owner name'"
            icon="User"
            v-model="form.first_name"
          />
          <DpcField
            :label="i18n.t('auth.email')"
            icon="Mail"
            type="email"
            v-model="form.email"
          />
        </div>

        <!-- Chairs selector -->
        <div>
          <label class="dpc-field-label">{{ i18n.locale === 'ar' ? 'عدد الكراسي' : 'Number of chairs' }}</label>
          <div class="chairs-grid">
            <div
              v-for="opt in chairOptions"
              :key="opt"
              :class="['chair-opt', form.num_chairs == opt && 'selected']"
              @click="form.num_chairs = opt"
            >{{ opt }}</div>
          </div>
        </div>

        <DpcField
          :label="i18n.t('auth.password') || 'Password'"
          icon="Lock"
          type="password"
          v-model="form.password"
          :hint="i18n.locale === 'ar' ? '٨ أحرف على الأقل' : 'Min 8 characters'"
          :error="error"
        />

        <label class="terms">
          <span class="checkbox" :class="agreeTerms && 'checked'" @click="agreeTerms = !agreeTerms">
            <DpcIcon v-if="agreeTerms" name="Check" :size="11" :stroke-width="3" />
          </span>
          <span>{{ i18n.locale === 'ar' ? 'أوافق على شروط الاستخدام وسياسة الخصوصية' : 'I agree to the Terms of Service and Privacy Policy' }}</span>
        </label>

        <DpcBtn type="submit" variant="teal" :full="true" :loading="submitting" style="margin-top:8px;height:48px;">
          {{ i18n.locale === 'ar' ? 'إنشاء حساب' : 'Create account' }}
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
        </DpcBtn>

        <p style="text-align:center;color:var(--ink-500);font-size:13px;margin-top:6px;">
          {{ i18n.locale === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?' }}
          <router-link to="/login" style="color:var(--teal-700);font-weight:600;">
            {{ i18n.t('auth.login') }}
          </router-link>
        </p>
      </form>
    </div>

    <!-- RIGHT: Navy preview -->
    <div class="hero dpc-hero-dots">
      <div class="glow-teal" />
      <div class="glow-navy" />
      <div class="hero-inner">
        <span class="eyebrow-mono">{{ i18n.locale === 'ar' ? 'معالج الإعداد' : 'SETUP WIZARD' }}</span>
        <h1 class="dpc-h" style="font-size:36px;line-height:1.15;color:#fff;margin-top:14px;margin-bottom:36px;max-width:420px;">
          {{ i18n.locale === 'ar' ? 'جاهز في ٣ خطوات سريعة' : 'Ready in 3 quick steps' }}
        </h1>
        <div class="step-cards">
          <div v-for="s in previewSteps" :key="s.n" class="step-card">
            <div class="step-icon">
              <DpcIcon :name="s.icon" :size="18" :stroke-width="1.7" />
            </div>
            <div class="step-meta">
              <div class="step-n">{{ s.n }}</div>
              <div class="step-label">{{ i18n.locale === 'ar' ? s.labelAr : s.labelEn }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reg-screen { display: flex; height: 100vh; width: 100%; overflow: hidden; }

.form-panel {
  width: 560px;
  flex: none;
  background: var(--paper);
  padding: 44px 56px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}
.fields { display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.chairs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 6px; }
.chair-opt {
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: var(--r);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  color: var(--ink-700);
  font-family: var(--font-mono);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all .12s;
}
.chair-opt.selected {
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1.5px var(--teal-600);
  color: var(--teal-700);
  font-weight: 600;
}
.terms {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--ink-600);
  font-size: 13px;
  cursor: pointer;
}
.checkbox {
  width: 18px; height: 18px;
  border-radius: 4px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  display: grid;
  place-items: center;
  flex: none;
  margin-top: 1px;
  cursor: pointer;
}
.checkbox.checked { background: var(--teal-600); box-shadow: none; color: #fff; }

/* Hero */
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
  font-size: 11px;
  letter-spacing: .12em;
  color: rgba(255,255,255,.5);
  text-transform: uppercase;
}
.step-cards { display: flex; flex-direction: column; gap: 12px; }
.step-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px;
  padding: 14px 16px;
}
.step-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: rgba(94,224,185,.14);
  color: #5ee0b9;
  display: grid;
  place-items: center;
  flex: none;
}
.step-n {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(255,255,255,.5);
  letter-spacing: .08em;
}
.step-label { font-size: 14.5px; color: #fff; font-weight: 500; }
</style>
