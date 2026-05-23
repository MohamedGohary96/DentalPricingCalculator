<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import WizardShell from '@/components/WizardShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import { useSetupStore, COUNTRIES } from '@/stores/setup.js'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const router = useRouter()
const setup  = useSetupStore()
const i18n   = useI18nStore()
const api    = axios.create({ withCredentials: true })

const saving       = ref(false)
const error        = ref('')
const customCountry = ref('')

async function next() {
  if (!setup.country) { error.value = 'Select a country.'; return }
  if (setup.country === 'Other' && !customCountry.value.trim()) {
    error.value = i18n.locale === 'ar' ? 'يرجى تحديد بلدك.' : 'Please specify your country.'
    return
  }
  saving.value = true
  error.value  = ''
  try {
    await api.put('/api/onboarding/location', {
      country:  setup.country === 'Other' ? customCountry.value.trim() : setup.country,
      province: setup.province,
    })
    router.push('/setup/2')
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to save location.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <WizardShell :active-step="1">
    <div class="step-eyebrow">{{ i18n.locale === 'ar' ? 'الخطوة ١ من ٣' : 'Step 1 of 3' }}</div>
    <h2 class="dpc-h step-title">
      {{ i18n.t('onboarding.locationTitle') || 'Where is your clinic?' }}
    </h2>
    <p class="step-sub">
      {{ i18n.t('onboarding.locationSub') || 'Your country sets the default currency and VAT rate. You can change these in step 3.' }}
    </p>

    <div class="form-stack">
      <!-- Country -->
      <div class="field-wrap">
        <label class="dpc-field-label">{{ i18n.t('onboarding.country') || 'Country' }}</label>
        <div class="field-inner">
          <DpcIcon name="Globe" :size="16" :stroke-width="1.6" class="field-icon" />
          <select
            v-model="setup.country"
            class="dpc-field-input field-with-icon"
            @change="setup.setCountry(setup.country)"
          >
            <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <p class="field-hint">
          {{ i18n.locale === 'ar'
            ? 'يحدد العملة الافتراضية ونسبة ضريبة القيمة المضافة'
            : 'Sets the default currency and VAT rate automatically' }}
        </p>
      </div>

      <!-- Other country text input -->
      <div v-if="setup.country === 'Other'" class="field-wrap other-field">
        <label class="dpc-field-label">{{ i18n.locale === 'ar' ? 'حدد بلدك' : 'Specify your country' }}</label>
        <div class="field-inner">
          <DpcIcon name="MapPin" :size="16" :stroke-width="1.6" class="field-icon" />
          <input
            v-model="customCountry"
            type="text"
            class="dpc-field-input field-with-icon"
            :placeholder="i18n.locale === 'ar' ? 'مثال: ليبيا، المغرب، تونس…' : 'e.g. Libya, Morocco, Tunisia…'"
            autofocus
          />
        </div>
      </div>

      <!-- Province / City -->
      <div class="field-wrap">
        <label class="dpc-field-label">{{ i18n.t('onboarding.province') || 'City / Province' }}</label>
        <div class="field-inner">
          <DpcIcon name="Building2" :size="16" :stroke-width="1.6" class="field-icon" />
          <input
            v-model="setup.province"
            type="text"
            class="dpc-field-input field-with-icon"
            :placeholder="i18n.t('onboarding.provincePlaceholder') || 'e.g. Cairo, Riyadh, Dubai…'"
          />
        </div>
      </div>

      <!-- Auto-fill preview -->
      <div v-if="setup.country" class="prefill-box">
        <DpcIcon name="Sparkles" :size="14" :stroke-width="1.6" class="sparkle" />
        <div class="prefill-text">
          <span>{{ i18n.locale === 'ar' ? 'سيتم تعيينه تلقائياً:' : 'Will be auto-set:' }}</span>
          <strong>{{ setup.currency }}</strong>
          <span>·</span>
          <strong>{{ i18n.locale === 'ar' ? 'ضريبة' : 'VAT' }} {{ setup.vat }}%</strong>
        </div>
      </div>

      <p v-if="error" class="err-msg">{{ error }}</p>
    </div>

    <template #footer>
      <DpcBtn
        variant="ghost"
        :icon="i18n.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'"
        @click="router.push('/setup')"
      >
        {{ i18n.locale === 'ar' ? 'رجوع' : 'Back' }}
      </DpcBtn>
      <DpcBtn
        variant="primary"
        :trailing-icon="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'"
        :loading="saving"
        style="min-width:180px;"
        @click="next"
      >
        {{ i18n.locale === 'ar' ? 'التالي' : 'Next' }}
      </DpcBtn>
    </template>
  </WizardShell>
</template>

<style scoped>
.step-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--teal-700);
  margin-bottom: 10px;
}
.step-title { font-size: 30px; line-height: 1.15; margin-bottom: 10px; }
.step-sub   { color: var(--ink-500); font-size: 15px; margin-bottom: 32px; max-width: 560px; line-height: 1.55; }

.form-stack { display: flex; flex-direction: column; gap: 22px; max-width: 480px; }

.field-wrap { display: flex; flex-direction: column; gap: 6px; }
.dpc-field-label { font-size: 12.5px; font-weight: 600; color: var(--ink-700); }

.field-inner { position: relative; display: flex; align-items: center; }
.field-icon {
  position: absolute;
  inset-inline-start: 12px;
  color: var(--ink-400);
  pointer-events: none;
}
.dpc-field-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border-radius: var(--r);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 14px;
  color: var(--ink-900);
  outline: none;
  border: none;
}
.dpc-field-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }
.field-with-icon { padding-inline-start: 36px; }

.field-hint { font-size: 12px; color: var(--ink-500); margin-top: 2px; }

.prefill-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1px var(--teal-100);
  font-size: 13.5px;
  color: var(--teal-800);
}
.sparkle { color: var(--teal-600); flex: none; }
.prefill-text { display: flex; align-items: center; gap: 6px; }
.prefill-text strong { font-weight: 700; }

.back-btn { color: var(--ink-500); }
.err-msg  { color: var(--danger-700); font-size: 13px; }

.other-field { animation: fade-in .15s ease; }
@keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
</style>
