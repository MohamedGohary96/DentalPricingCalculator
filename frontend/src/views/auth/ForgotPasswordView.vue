<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcField from '@/components/DpcField.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const router = useRouter()
const i18n   = useI18nStore()
const api    = axios.create({ withCredentials: true })

const email      = ref('')
const error      = ref('')
const sent       = ref(false)
const submitting = ref(false)

async function submit() {
  if (!email.value) { error.value = i18n.t('auth.errorEnterEmail'); return }
  submitting.value = true
  error.value = ''
  try {
    await api.post('/api/forgot-password', { email: email.value })
    sent.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'Something went wrong.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="screen">
    <div class="blob-bl" />
    <div class="topbar-start"><DpcLogo /></div>
    <div class="topbar-end"><LangSwitch /></div>

    <div class="card">
      <div class="icon-tile">
        <DpcIcon name="Lock" :size="24" :stroke-width="1.6" />
      </div>

      <template v-if="!sent">
        <h1 class="dpc-h" style="font-size:26px;margin-bottom:8px;">
          {{ i18n.t('auth.forgotTitle') || 'Forgot your password?' }}
        </h1>
        <p style="color:var(--ink-500);font-size:14px;line-height:1.55;margin-bottom:24px;">
          {{ i18n.t('auth.forgotSub') || "Enter your email and we'll send a reset link. Expires in 30 minutes." }}
        </p>
        <div class="fields">
          <DpcField
            :label="i18n.t('auth.email') || 'Email address'"
            icon="Mail"
            type="email"
            v-model="email"
            :error="error"
          />
          <DpcBtn variant="primary" :full="true" style="height:46px;margin-top:4px;" :loading="submitting" @click="submit">
            {{ i18n.t('auth.sendReset') || 'Send reset link' }}
            <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="15" :stroke-width="2" />
          </DpcBtn>
        </div>
      </template>

      <template v-else>
        <h1 class="dpc-h" style="font-size:26px;margin-bottom:8px;">{{ i18n.t('auth.checkInbox') }}</h1>
        <p style="color:var(--ink-500);font-size:14px;line-height:1.55;">
          {{ i18n.t('auth.resetLinkSentPre') }} <strong>{{ email }}</strong>. {{ i18n.t('auth.resetLinkSentPost') }}
        </p>
      </template>

      <div class="back-row">
        <router-link to="/login" class="back-link">
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'" :size="14" :stroke-width="2" />
          {{ i18n.t('auth.backToLogin') || 'Back to sign in' }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen {
  min-height: 100vh;
  background: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 24px;
}
.blob-bl {
  position: absolute; width: 560px; height: 560px; border-radius: 50%;
  background: radial-gradient(circle, rgba(13,148,136,.08) 0%, transparent 60%);
  bottom: -200px; inset-inline-start: -200px; pointer-events: none;
}
.topbar-start { position: absolute; top: 28px; inset-inline-start: 28px; }
.topbar-end   { position: absolute; top: 28px; inset-inline-end: 28px; }

.card {
  width: 460px;
  padding: 40px;
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg), inset 0 0 0 1px var(--line);
  position: relative;
  z-index: 1;
}
.icon-tile {
  width: 56px; height: 56px;
  border-radius: 14px;
  margin-bottom: 22px;
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--teal-100);
}
.fields { display: flex; flex-direction: column; gap: 14px; }
.back-row { display: flex; justify-content: center; margin-top: 22px; }
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--teal-700);
  font-size: 13px;
  font-weight: 500;
}
</style>
