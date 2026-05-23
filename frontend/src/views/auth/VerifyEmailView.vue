<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const router  = useRouter()
const i18n    = useI18nStore()
const api     = axios.create({ withCredentials: true })

const otp = ref(['', '', '', '', '', ''])
const error = ref('')
const submitting = ref(false)
const countdown = ref(60)
const showSkipWarning = ref(false)

function skipVerification() {
  router.push('/login')
}

const timer = setInterval(() => { if (countdown.value > 0) countdown.value-- }, 1000)
onUnmounted(() => clearInterval(timer))

function onInput(e, idx) {
  const val = e.target.value.slice(-1)
  otp.value[idx] = val
  if (val && idx < 5) {
    const next = e.target.closest('.otp-row').querySelectorAll('.otp-box')[idx + 1]
    next?.focus()
  }
}

function onKeydown(e, idx) {
  if (e.key === 'Backspace' && !otp.value[idx] && idx > 0) {
    const prev = e.target.closest('.otp-row').querySelectorAll('.otp-box')[idx - 1]
    prev?.focus()
  }
}

async function submit() {
  const code = otp.value.join('')
  if (code.length < 6) { error.value = i18n.t('auth.errorInvalidCode'); return }
  submitting.value = true
  error.value = ''
  try {
    await api.post('/api/verify-email', { code })
    router.push('/setup')
  } catch (e) {
    error.value = e.response?.data?.error || i18n.t('auth.errorInvalidCode')
  } finally {
    submitting.value = false
  }
}

async function resend() {
  if (countdown.value > 0) return
  await api.post('/api/resend-verification', {}).catch(() => {})
  countdown.value = 60
}
</script>

<template>
  <div class="verify-screen">
    <!-- decorative blobs -->
    <div class="blob-tl" />
    <div class="blob-br" />

    <div class="topbar-start"><DpcLogo /></div>
    <div class="topbar-end"><LangSwitch /></div>

    <div class="card dpc-panel">
      <div class="mail-icon">
        <DpcIcon name="Mail" :size="28" :stroke-width="1.6" />
      </div>

      <h2 class="dpc-h" style="font-size:26px;text-align:center;margin-bottom:8px;">
        {{ i18n.t('auth.verifyTitle') || 'Check your email' }}
      </h2>
      <p style="color:var(--ink-500);text-align:center;font-size:14.5px;margin-bottom:4px;">
        {{ i18n.t('auth.verifySub') || "We sent a 6-digit code to" }}
      </p>

      <div class="otp-row">
        <input
          v-for="(_, idx) in otp"
          :key="idx"
          :value="otp[idx]"
          type="text"
          maxlength="1"
          inputmode="numeric"
          class="otp-box"
          :class="otp[idx] ? 'filled' : 'empty'"
          @input="onInput($event, idx)"
          @keydown="onKeydown($event, idx)"
        />
      </div>

      <p v-if="error" class="err-msg">{{ error }}</p>

      <DpcBtn variant="primary" :full="true" :loading="submitting" style="height:48px;" @click="submit">
        {{ i18n.t('auth.verifyCta') || 'Verify email' }}
        <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
      </DpcBtn>

      <div class="footer-row">
        <span>
          {{ i18n.t('auth.resendIn') || 'Resend in' }}
          <span class="dpc-num" style="color:var(--ink-800);font-weight:500;">
            0:{{ String(countdown).padStart(2, '0') }}
          </span>
        </span>
        <button
          class="change-link"
          :disabled="countdown > 0"
          @click="resend"
        >{{ i18n.t('auth.changeEmail') || 'Resend code' }}</button>
      </div>

      <!-- Skip verification -->
      <div class="skip-row">
        <button class="skip-link" @click="showSkipWarning = true">
          {{ i18n.dir === 'rtl' ? 'تخطي التحقق الآن' : 'Skip verification for now' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Skip warning modal -->
  <div v-if="showSkipWarning" class="modal-overlay" @click.self="showSkipWarning = false">
    <div class="modal-box">
      <div class="modal-icon">
        <DpcIcon name="AlertTriangle" :size="22" :stroke-width="1.6" />
      </div>
      <h3 class="modal-title">
        {{ i18n.dir === 'rtl' ? 'تحذير قبل المتابعة' : 'Before you continue' }}
      </h3>
      <p class="modal-body">
        {{ i18n.dir === 'rtl'
          ? 'إذا تخطيت التحقق، لن تتمكن من إعادة تعيين كلمة المرور إذا نسيتها، وقد تفقد الوصول إلى حسابك بشكل دائم.'
          : "If you skip verification, you won't be able to reset your password if you forget it, and you may permanently lose access to your account." }}
      </p>
      <div class="modal-actions">
        <button class="modal-btn-cancel" @click="showSkipWarning = false">
          {{ i18n.dir === 'rtl' ? 'عودة للتحقق' : 'Go back & verify' }}
        </button>
        <button class="modal-btn-skip" @click="skipVerification">
          {{ i18n.dir === 'rtl' ? 'تخطي على مسؤوليتي' : 'Skip anyway' }}
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
  width: 480px;
  padding: 40px;
  background: var(--surface);
  box-shadow: var(--shadow-lg), inset 0 0 0 1px var(--line);
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.mail-icon {
  width: 64px; height: 64px;
  border-radius: 16px;
  margin: 0 auto 22px;
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--teal-100);
}
.otp-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 24px 0;
  direction: ltr;
}
.otp-box {
  width: 52px; height: 60px;
  border-radius: 10px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 500;
  outline: none;
  border: 0;
  transition: box-shadow .12s;
}
.otp-box.empty {
  background: var(--surface);
  box-shadow: inset 0 0 0 1.5px var(--teal-600);
  color: transparent;
}
.otp-box.filled {
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1px var(--teal-200);
  color: var(--teal-800);
}
.otp-box:focus { box-shadow: inset 0 0 0 2px var(--teal-600), 0 0 0 4px rgba(13,148,136,.14); }

.err-msg { color: var(--danger-600); font-size: 13px; text-align: center; margin-bottom: 12px; }

.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22px;
  font-size: 13px;
  color: var(--ink-500);
}
.change-link {
  color: var(--teal-700);
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}
.change-link:disabled { opacity: .4; cursor: not-allowed; }

.skip-row { display: flex; justify-content: center; margin-top: 14px; }
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
  border-radius: var(--r-lg);
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
</style>
