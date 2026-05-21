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

const username   = ref('')
const password   = ref('')
const remember   = ref(false)
const showPass   = ref(false)
const error      = ref('')
const submitting = ref(false)

async function submit() {
  if (!username.value || !password.value) { error.value = 'Please fill in all fields.'; return }
  submitting.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    router.push('/app/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Login failed.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-screen">
    <!-- LEFT: Navy hero -->
    <div class="hero dpc-hero-dots">
      <!-- glow blobs -->
      <div class="glow-teal" />
      <div class="glow-navy" />

      <div class="hero-top">
        <DpcLogo :on-dark="true" />
      </div>

      <div class="hero-body">
        <div class="eyebrow-pill">{{ i18n.locale === 'ar' ? 'ذكاء العيادة' : 'Clinic Intelligence' }}</div>
        <h1 class="dpc-h hero-title">{{ i18n.locale === 'ar' ? 'سعّر كل خدمة بثقة' : 'Price every service with confidence' }}</h1>
        <p class="hero-body-text">{{ i18n.locale === 'ar' ? 'حاسبة الأسعار المصممة للعيادات — مبنية على بيانات ٣٠٠+ عيادة.' : 'The pricing calculator built for dental clinics — backed by data from 300+ practices.' }}</p>
        <div class="bullets">
          <div v-for="(b, i) in (i18n.locale === 'ar'
            ? ['تفصيل التكلفة الحقيقية لكل ساعة كرسي', 'تحليل الهامش الفوري لكل خدمة', 'واجهة ثنائية اللغة EN / AR']
            : ['Real cost breakdown per chair-hour', 'Live margin analysis on every service', 'Bilingual EN / AR interface'])"
            :key="i" class="bullet">
            <div class="bullet-dot"><DpcIcon name="Check" :size="12" :stroke-width="2.4" /></div>
            <span>{{ b }}</span>
          </div>
        </div>
      </div>

      <div class="hero-footer">
        <DpcIcon name="Sparkles" :size="14" :stroke-width="1.6" />
        <span>{{ i18n.locale === 'ar' ? 'بياناتك مشفرة ولن تُشارك مع أحد.' : 'Your data is encrypted and never shared.' }}</span>
      </div>
    </div>

    <!-- RIGHT: Form panel -->
    <div class="form-panel">
      <div class="form-topbar">
        <LangSwitch />
      </div>

      <div class="form-body">
        <h2 class="dpc-h form-title">{{ i18n.t('auth.login') }}</h2>
        <p class="form-sub">{{ i18n.locale === 'ar' ? 'مرحباً بعودتك. أدخل بياناتك للمتابعة.' : 'Welcome back. Enter your details below.' }}</p>

        <form class="fields" @submit.prevent="submit">
          <DpcField
            :label="i18n.t('auth.username') || 'Username or email'"
            icon="User"
            v-model="username"
            placeholder="you@clinic.com"
          />
          <div class="pass-wrap">
            <DpcField
              :label="i18n.t('auth.password') || 'Password'"
              icon="Lock"
              :type="showPass ? 'text' : 'password'"
              v-model="password"
              placeholder="••••••••"
              :error="error"
            />
            <button type="button" class="eye-btn" @click="showPass = !showPass">
              <DpcIcon :name="showPass ? 'EyeOff' : 'Eye'" :size="16" :stroke-width="1.6" />
            </button>
          </div>

          <div class="row-between">
            <label class="remember">
              <span class="checkbox" :class="remember && 'checked'" @click="remember = !remember">
                <DpcIcon v-if="remember" name="Check" :size="10" :stroke-width="3" />
              </span>
              {{ i18n.locale === 'ar' ? 'تذكرني' : 'Remember me' }}
            </label>
            <router-link to="/forgot-password" class="forgot">
              {{ i18n.t('auth.forgotPassword') || 'Forgot password?' }}
            </router-link>
          </div>

          <DpcBtn type="submit" variant="primary" :loading="submitting" :full="true" style="margin-top:6px;height:48px;">
            {{ i18n.t('auth.login') }}
            <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
          </DpcBtn>
        </form>

        <div class="or-divider">
          <div class="or-line" /><span>{{ i18n.t('common.or') || 'or' }}</span><div class="or-line" />
        </div>

        <div class="register-box">
          <div class="register-text">
            <div class="register-sub">{{ i18n.t('auth.noAccount') }}</div>
            <div class="register-main">{{ i18n.locale === 'ar' ? 'أنشئ ملف عيادتك مجاناً' : 'Create your clinic profile free' }}</div>
          </div>
          <router-link to="/register" class="register-link">
            {{ i18n.t('auth.register') || 'Register' }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-screen {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* ── Hero ── */
.hero {
  flex: 1;
  min-width: 0;
  position: relative;
  background: linear-gradient(165deg, #0a1424 0%, #0f2545 60%, #163058 100%);
  color: #fff;
  padding: 44px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}
.glow-teal {
  position: absolute;
  width: 540px; height: 540px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(13,148,136,.32) 0%, transparent 60%);
  bottom: -240px; inset-inline-end: -180px;
  filter: blur(8px);
  pointer-events: none;
}
.glow-navy {
  position: absolute;
  width: 380px; height: 380px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(75,115,165,.22) 0%, transparent 60%);
  top: -160px; inset-inline-start: -120px;
  pointer-events: none;
}
.hero-top { position: relative; z-index: 1; }
.hero-body { position: relative; z-index: 1; max-width: 460px; }
.hero-footer {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 10px;
  color: rgba(255,255,255,.5); font-size: 12.5px;
}

.eyebrow-pill {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(94,224,185,.14);
  color: #5ee0b9;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: .06em;
  text-transform: uppercase;
  border: 1px solid rgba(94,224,185,.22);
  margin-bottom: 28px;
}
.hero-title {
  font-size: 46px;
  line-height: 1.08;
  color: #fff;
  margin-bottom: 18px;
  letter-spacing: -0.025em;
}
.hero-body-text {
  font-size: 16px;
  line-height: 1.55;
  color: rgba(255,255,255,.72);
  margin-bottom: 32px;
  max-width: 420px;
}
.bullets { display: flex; flex-direction: column; gap: 14px; }
.bullet {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: rgba(255,255,255,.85);
  font-size: 14px;
}
.bullet-dot {
  flex: none;
  width: 22px; height: 22px;
  border-radius: 999px;
  background: rgba(94,224,185,.18);
  color: #5ee0b9;
  display: grid;
  place-items: center;
}

/* ── Form panel ── */
.form-panel {
  width: 500px;
  flex: none;
  background: var(--paper);
  padding: 44px 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow-y: auto;
}
.form-topbar {
  position: absolute;
  top: 28px;
  inset-inline-end: 28px;
}
.form-body { display: flex; flex-direction: column; }
.form-title { font-size: 28px; margin-bottom: 8px; }
.form-sub   { color: var(--ink-500); font-size: 14.5px; margin-bottom: 28px; }

.fields { display: flex; flex-direction: column; gap: 16px; }

.pass-wrap { position: relative; }
.eye-btn {
  position: absolute;
  inset-inline-end: 14px;
  top: 50%;
  transform: translateY(-50%) translateY(11px);
  color: var(--ink-400);
  padding: 4px;
  cursor: pointer;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-600);
  font-size: 13.5px;
  cursor: pointer;
}
.checkbox {
  width: 16px; height: 16px;
  border-radius: 4px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  display: grid;
  place-items: center;
  flex: none;
  cursor: pointer;
}
.checkbox.checked {
  background: var(--teal-600);
  box-shadow: none;
  color: #fff;
}
.forgot { color: var(--teal-700); font-size: 13.5px; font-weight: 500; }

.or-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 26px 0;
  color: var(--ink-400);
  font-size: 12px;
}
.or-line { flex: 1; height: 1px; background: var(--line); }

.register-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-radius: var(--r);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
}
.register-sub  { color: var(--ink-500); font-size: 13.5px; }
.register-main { color: var(--ink-900); font-weight: 500; font-size: 13.5px; }
.register-link { color: var(--teal-700); font-size: 13.5px; font-weight: 600; }
</style>
