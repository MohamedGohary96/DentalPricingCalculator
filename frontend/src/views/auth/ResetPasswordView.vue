<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcField from '@/components/DpcField.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const router = useRouter()
const route  = useRoute()
const i18n   = useI18nStore()
const api    = axios.create({ withCredentials: true })

const password  = ref('')
const confirm   = ref('')
const error     = ref('')
const submitting = ref(false)

// Strength: 0-4
const strength = computed(() => {
  const p = password.value
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})

const strengthLabel = computed(() => [
  '', i18n.t('auth.strengthWeak'), i18n.t('auth.strengthFair'),
  i18n.t('auth.strengthStrong'), i18n.t('auth.strengthVeryStrong'),
][strength.value] || '')
const strengthColor = computed(() => ['', 'var(--danger-600)', 'var(--warning-600)', 'var(--teal-600)', 'var(--teal-600)'][strength.value] || '')

const rules = computed(() => [
  { ok: password.value.length >= 8,                                    label: i18n.t('auth.ruleChars') },
  { ok: /[A-Z]/.test(password.value) && /[a-z]/.test(password.value), label: i18n.t('auth.ruleCase') },
  { ok: /\d/.test(password.value),                                     label: i18n.t('auth.ruleNumber') },
  { ok: /[^A-Za-z0-9]/.test(password.value),                          label: i18n.t('auth.ruleSymbol') },
])

async function submit() {
  if (password.value !== confirm.value) { error.value = i18n.t('auth.errorPasswordMismatch'); return }
  if (strength.value < 2) { error.value = i18n.t('auth.errorPasswordWeak'); return }
  submitting.value = true
  error.value = ''
  try {
    await api.post('/api/reset-password', { token: route.query.token, password: password.value })
    router.push('/login')
  } catch (e) {
    error.value = e.response?.data?.error || i18n.t('auth.errorResetFailed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="screen">
    <div class="topbar-start"><DpcLogo /></div>
    <div class="topbar-end"><LangSwitch /></div>

    <div class="card">
      <div class="icon-tile">
        <DpcIcon name="Lock" :size="24" :stroke-width="1.6" />
      </div>

      <h1 class="dpc-h" style="font-size:26px;margin-bottom:8px;">
        {{ i18n.t('auth.resetTitle') || 'Set a new password' }}
      </h1>
      <p style="color:var(--ink-500);font-size:14px;line-height:1.55;margin-bottom:22px;">
        {{ i18n.t('auth.resetSub') || "Pick a strong password. You'll be signed in automatically." }}
      </p>

      <div class="fields">
        <div>
          <DpcField
            :label="i18n.t('auth.newPassword') || 'New password'"
            icon="Lock"
            type="password"
            v-model="password"
          />
          <!-- Strength meter -->
          <div v-if="password" style="margin-top:10px;">
            <div class="strength-bar">
              <div
                v-for="i in 4" :key="i"
                :style="{ background: i <= strength ? strengthColor : 'var(--ink-200)' }"
                class="segment"
              />
            </div>
            <div style="font-size:11.5px;font-weight:500;margin-top:4px;" :style="{ color: strengthColor }">
              {{ strengthLabel }}
            </div>
          </div>
        </div>

        <DpcField
          :label="i18n.t('auth.confirmPassword') || 'Confirm password'"
          icon="Lock"
          type="password"
          v-model="confirm"
          :error="error"
        />

        <!-- Rules checklist -->
        <div class="rules-box">
          <div v-for="(r, i) in rules" :key="i" class="rule">
            <span class="rule-dot" :class="r.ok && 'ok'">
              <DpcIcon v-if="r.ok" name="Check" :size="9" :stroke-width="3" />
            </span>
            <span :style="{ color: r.ok ? 'var(--ink-700)' : 'var(--ink-400)' }">{{ r.label }}</span>
          </div>
        </div>

        <DpcBtn variant="teal" :full="true" style="height:46px;margin-top:6px;" :loading="submitting" @click="submit">
          {{ i18n.t('auth.resetCta') || 'Reset & sign in' }}
          <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="15" :stroke-width="2" />
        </DpcBtn>
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
  padding: 24px;
  position: relative;
}
.topbar-start { position: absolute; top: 28px; inset-inline-start: 28px; }
.topbar-end   { position: absolute; top: 28px; inset-inline-end: 28px; }

.card {
  width: 100%;
  max-width: 460px;
  padding: 40px;
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg), inset 0 0 0 1px var(--line);
}

@media (max-width: 767px) {
  .screen { padding: 16px; }
  .card { padding: 28px var(--gutter, 20px); }
  .topbar-start,
  .topbar-end { top: 16px; }
  .topbar-start { inset-inline-start: 16px; }
  .topbar-end   { inset-inline-end: 16px; }
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

.strength-bar { display: flex; gap: 4px; }
.segment { flex: 1; height: 4px; border-radius: 999px; transition: background .2s; }

.rules-box {
  padding: 12px;
  border-radius: 10px;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
}
.rule { display: flex; gap: 8px; align-items: center; }
.rule-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  flex: none;
  background: var(--ink-200);
  display: grid;
  place-items: center;
  color: #fff;
}
.rule-dot.ok { background: var(--teal-600); }
</style>
