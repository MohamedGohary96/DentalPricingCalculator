<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useI18nStore } from '@/stores/i18n.js'
import { useAuthStore } from '@/stores/auth.js'
import axios from 'axios'

const router  = useRouter()
const route   = useRoute()
const i18n    = useI18nStore()
const auth    = useAuthStore()
const api     = axios.create({ withCredentials: true })

const verifying = ref(false)
const verified = ref(false)
const error = ref('')
const resending = ref(false)
const countdown = ref(60)
const showSkipWarning = ref(false)

const timer = setInterval(() => { if (countdown.value > 0) countdown.value-- }, 1000)
onUnmounted(() => clearInterval(timer))

function skipVerification() {
  router.push('/login')
}

async function verifyToken(token) {
  verifying.value = true
  error.value = ''
  try {
    const res = await api.post('/api/verify-email', { token })
    verified.value = true
    setTimeout(() => {
      const oc = auth.user?.onboarding_completed
      router.push(oc === 0 || oc === false ? '/setup' : '/app/dashboard')
    }, 2000)
  } catch (e) {
    error.value = e.response?.data?.error || 'Verification failed. Please request a new link.'
  } finally {
    verifying.value = false
  }
}

async function resend() {
  if (countdown.value > 0 || resending.value) return
  resending.value = true
  error.value = ''
  try {
    const email = auth.user?.email
    if (!email) {
      error.value = 'Please log in to resend verification email'
      return
    }
    await api.post('/api/resend-verification', { email })
    countdown.value = 60
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to resend email'
  } finally {
    resending.value = false
  }
}

onMounted(() => {
  const token = route.query.token
  if (token) {
    verifyToken(token)
  }
})
</script>

<template>
  <div class="verify-screen">
    <!-- decorative blobs -->
    <div class="blob-tl" />
    <div class="blob-br" />

    <div class="topbar-start"><DpcLogo /></div>
    <div class="topbar-end"><LangSwitch /></div>

    <div class="card dpc-panel">
      <!-- Verifying state -->
      <template v-if="verifying">
        <div class="status-icon verifying">
          <DpcIcon name="Mail" :size="28" :stroke-width="1.6" />
        </div>
        <h2 class="dpc-h card-title">
          {{ i18n.locale === 'ar' ? 'جاري التحقق...' : 'Verifying your email...' }}
        </h2>
        <p class="card-subtitle">
          {{ i18n.locale === 'ar' ? 'يرجى الانتظار بينما نتحقق من بريدك الإلكتروني.' : 'Please wait while we verify your email address.' }}
        </p>
      </template>

      <!-- Success state -->
      <template v-else-if="verified">
        <div class="status-icon success">
          <DpcIcon name="CheckCircle" :size="28" :stroke-width="1.6" />
        </div>
        <h2 class="dpc-h card-title">
          {{ i18n.locale === 'ar' ? 'تم التحقق بنجاح!' : 'Email verified!' }}
        </h2>
        <p class="card-subtitle">
          {{ i18n.locale === 'ar' ? 'سيتم توجيهك الآن...' : 'Redirecting you now...' }}
        </p>
      </template>

      <!-- Error / Resend state -->
      <template v-else>
        <div class="status-icon" :class="error ? 'error' : 'default'">
          <DpcIcon :name="error ? 'AlertCircle' : 'Mail'" :size="28" :stroke-width="1.6" />
        </div>

        <h2 class="dpc-h card-title">
          {{ error
            ? (i18n.locale === 'ar' ? 'فشل التحقق' : 'Verification failed')
            : (i18n.locale === 'ar' ? 'تحقق من بريدك' : 'Check your email')
          }}
        </h2>
        <p class="card-subtitle">
          {{ error
            ? error
            : (i18n.locale === 'ar'
              ? 'انقر على رابط التحقق في البريد الإلكتروني الذي أرسلناه لك.'
              : 'Click the verification link in the email we sent you.')
          }}
        </p>

        <p v-if="error" class="err-msg">{{ error }}</p>

        <DpcBtn
          variant="primary"
          :full="true"
          :loading="resending"
          :disabled="countdown > 0"
          style="height:48px; margin-top: 24px;"
          @click="resend"
        >
          {{ i18n.locale === 'ar' ? 'إعادة إرسال البريد' : 'Resend verification email' }}
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
        </DpcBtn>

        <div v-if="countdown > 0" class="footer-row">
          <span style="color: var(--ink-500); font-size: 13px;">
            {{ i18n.locale === 'ar' ? 'يمكنك إعادة الإرسال في' : 'Resend available in' }}
            <span class="dpc-num" style="color:var(--ink-800);font-weight:500;">
              0:{{ String(countdown).padStart(2, '0') }}
            </span>
          </span>
        </div>

        <!-- Skip verification -->
        <div class="skip-row">
          <button class="skip-link" @click="showSkipWarning = true">
            {{ i18n.locale === 'ar' ? 'تخطي التحقق الآن' : 'Skip verification for now' }}
          </button>
        </div>
      </template>
    </div>
  </div>

  <!-- Skip warning modal -->
  <div v-if="showSkipWarning" class="modal-overlay" @click.self="showSkipWarning = false">
    <div class="modal-box">
      <div class="modal-icon">
        <DpcIcon name="AlertTriangle" :size="22" :stroke-width="1.6" />
      </div>
      <h3 class="modal-title">
        {{ i18n.locale === 'ar' ? 'تحذير قبل المتابعة' : 'Before you continue' }}
      </h3>
      <p class="modal-body">
        {{ i18n.locale === 'ar'
          ? 'إذا تخطيت التحقق، لن تتمكن من إعادة تعيين كلمة المرور إذا نسيتها، وقد تفقد الوصول إلى حسابك بشكل دائم.'
          : "If you skip verification, you won't be able to reset your password if you forget it, and you may permanently lose access to your account." }}
      </p>
      <div class="modal-actions">
        <button class="modal-btn-cancel" @click="showSkipWarning = false">
          {{ i18n.locale === 'ar' ? 'عودة للتحقق' : 'Go back & verify' }}
        </button>
        <button class="modal-btn-skip" @click="skipVerification">
          {{ i18n.locale === 'ar' ? 'تخطي على مسؤوليتي' : 'Skip anyway' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verify-screen {
  min-height: 100vh;
  background: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
}
.blob-tl {
  position: absolute; width: 600px; height: 600px; border-radius: 50%;
  background: radial-gradient(circle, rgba(13,148,136,.10) 0%, transparent 60%);
  top: -200px; inset-inline-start: -200px; pointer-events: none;
}
.blob-br {
  position: absolute; width: 500px; height: 500px; border-radius: 50%;
  background: radial-gradient(circle, rgba(15,37,69,.08) 0%, transparent 60%);
  bottom: -180px; inset-inline-end: -180px; pointer-events: none;
}
.topbar-start { position: absolute; top: 28px; inset-inline-start: 28px; }
.topbar-end   { position: absolute; top: 28px; inset-inline-end: 28px; }

.card {
  width: 100%;
  max-width: 480px;
  padding: 40px;
  background: var(--surface);
  box-shadow: var(--shadow-lg), inset 0 0 0 1px var(--line);
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.status-icon {
  width: 64px; height: 64px;
  border-radius: 16px;
  margin: 0 auto 22px;
  display: grid;
  place-items: center;
  transition: all var(--duration-normal);
}
.status-icon.default {
  background: var(--teal-50);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1px var(--teal-100);
}
.status-icon.verifying {
  background: var(--sky-50);
  color: var(--sky-700);
  box-shadow: inset 0 0 0 1px var(--sky-100);
  animation: pulse 2s ease-in-out infinite;
}
.status-icon.success {
  background: var(--success-50);
  color: var(--success-700);
  box-shadow: inset 0 0 0 1px var(--success-100);
}
.status-icon.error {
  background: var(--danger-50);
  color: var(--danger-700);
  box-shadow: inset 0 0 0 1px var(--danger-100);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.card-title {
  font-size: 26px;
  text-align: center;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.card-subtitle {
  color: var(--ink-500);
  text-align: center;
  font-size: 14.5px;
  margin-bottom: 4px;
  max-width: 360px;
  line-height: 1.5;
}

.err-msg {
  color: var(--danger-600);
  font-size: 13px;
  text-align: center;
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--danger-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--danger-100);
}

.footer-row {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 14px;
  font-size: 13px;
  color: var(--ink-500);
}

.skip-row { display: flex; justify-content: center; margin-top: 16px; }
.skip-link {
  font-size: 12px; color: var(--ink-400);
  cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
  transition: color .12s;
}
.skip-link:hover { color: var(--ink-600); }

/* Warning modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.modal-box {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 32px 28px;
  max-width: 400px; width: 100%;
  display: flex; flex-direction: column; gap: 14px;
}
.modal-icon {
  width: 48px; height: 48px; border-radius: 12px;
  background: var(--warning-50); color: var(--warning-600);
  display: grid; place-items: center;
  box-shadow: inset 0 0 0 1px var(--warning-200);
}
.modal-title { font-size: 17px; font-weight: 700; color: var(--ink-900); margin: 0; }
.modal-body  { font-size: 13.5px; color: var(--ink-600); line-height: 1.6; margin: 0; }
.modal-actions { display: flex; gap: 10px; margin-top: 4px; }
.modal-btn-cancel {
  flex: 1; height: 42px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
  background: var(--teal-600); color: #fff; cursor: pointer;
  transition: background .12s;
}
.modal-btn-cancel:hover { background: var(--teal-700); }
.modal-btn-skip {
  height: 42px; padding: 0 18px; border-radius: 10px; font-size: 13px;
  background: var(--paper-2); color: var(--ink-500);
  box-shadow: inset 0 0 0 1px var(--line); cursor: pointer;
  transition: background .12s;
}
.modal-btn-skip:hover { background: var(--danger-50); color: var(--danger-600); box-shadow: inset 0 0 0 1px var(--danger-200); }

@media (max-width: 767px) {
  .verify-screen { padding: 16px; }
  .card { padding: 28px var(--gutter, 20px); }
  .topbar-start,
  .topbar-end { top: 16px; }
  .topbar-start { inset-inline-start: 16px; }
  .topbar-end   { inset-inline-end: 16px; }
}
</style>
