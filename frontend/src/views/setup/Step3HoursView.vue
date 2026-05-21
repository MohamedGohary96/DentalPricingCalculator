<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import WizardShell from '@/components/WizardShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import { useSetupStore } from '@/stores/setup.js'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const router = useRouter()
const setup  = useSetupStore()
const auth   = useAuthStore()
const i18n   = useI18nStore()
const api    = axios.create({ withCredentials: true })

const saving  = ref(false)
const error   = ref('')

const currency = ref(setup.currency || 'EGP')
const vat      = ref(setup.vat ?? 0)
const profit   = ref(40)
const rounding = ref(5)

const currencies = ['EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'USD']
const roundings  = [1, 5, 10, 25, 50, 100]

onMounted(async () => {
  // Try loading existing global settings
  try {
    const { data } = await api.get('/api/settings/global')
    if (data.currency)              currency.value = data.currency
    if (data.vat_percent != null)   vat.value      = data.vat_percent
    if (data.default_profit_percent != null) profit.value = data.default_profit_percent
    if (data.rounding_nearest != null)       rounding.value = data.rounding_nearest
  } catch {
    // first time — use setupStore defaults from country selection
  }
})

async function complete() {
  saving.value = true
  error.value  = ''
  try {
    await api.put('/api/settings/global', {
      currency:               currency.value,
      vat_percent:            vat.value,
      default_profit_percent: profit.value,
      rounding_nearest:       rounding.value,
    })
    await api.post('/api/onboarding/complete', {})
    if (auth.user) auth.user.onboarding_completed = 1
    router.push('/app/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to complete setup.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <WizardShell :active-step="3">
    <div class="step-eyebrow">{{ i18n.locale === 'ar' ? 'الخطوة ٣ من ٣' : 'Step 3 of 3' }}</div>
    <h2 class="dpc-h step-title">
      {{ i18n.t('onboarding.settingsTitle') || 'Currency & pricing defaults' }}
    </h2>
    <p class="step-sub">
      {{ i18n.t('onboarding.settingsSub') || 'These defaults apply to every service. You can override them per-service later.' }}
    </p>

    <div class="form-stack">
      <!-- Currency + VAT -->
      <div class="field-row">
        <div class="field-wrap">
          <label class="dpc-field-label">{{ i18n.locale === 'ar' ? 'العملة' : 'Currency' }}</label>
          <div class="field-inner">
            <DpcIcon name="CircleDollarSign" :size="16" :stroke-width="1.6" class="field-icon" />
            <select v-model="currency" class="dpc-field-input field-with-icon">
              <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div class="field-wrap">
          <label class="dpc-field-label">{{ i18n.locale === 'ar' ? 'ضريبة القيمة المضافة %' : 'VAT %' }}</label>
          <input v-model.number="vat" type="number" min="0" max="100" step="0.5" class="dpc-field-input" />
          <p class="field-hint">{{ i18n.t('onboarding.vatHint') || 'Applied on top of service cost.' }}</p>
        </div>
      </div>

      <!-- Profit % -->
      <div class="field-wrap wide">
        <label class="dpc-field-label">{{ i18n.locale === 'ar' ? 'هامش الربح الافتراضي %' : 'Default profit margin %' }}</label>
        <input v-model.number="profit" type="number" min="0" max="500" step="1" class="dpc-field-input" />
        <p class="field-hint">{{ i18n.t('onboarding.profitHint') || 'How much to mark up above total cost. 40% is typical for a small clinic.' }}</p>
      </div>

      <!-- Rounding -->
      <div class="field-wrap wide">
        <label class="dpc-field-label">{{ i18n.locale === 'ar' ? 'تقريب السعر' : 'Price rounding' }}</label>
        <div class="rounding-chips">
          <button
            v-for="r in roundings"
            :key="r"
            :class="['rounding-chip', rounding === r && 'chip-active']"
            @click="rounding = r"
          >{{ r }}</button>
        </div>
        <p class="field-hint">{{ i18n.t('onboarding.roundingHint') || 'Final prices are rounded up to the nearest selected value.' }}</p>
      </div>

      <!-- Preview formula -->
      <div class="formula-box">
        <div class="formula-title">
          <DpcIcon name="Info" :size="14" :stroke-width="1.6" />
          {{ i18n.locale === 'ar' ? 'مثال حساب السعر' : 'Price formula preview' }}
        </div>
        <div class="formula-line">
          <span class="formula-label">{{ i18n.locale === 'ar' ? 'التكلفة' : 'Cost' }}</span>
          <span class="formula-op">×</span>
          <span class="formula-val">(1 + {{ profit }}%)</span>
          <span class="formula-op">×</span>
          <span class="formula-val">(1 + {{ vat }}%)</span>
          <span class="formula-op">=</span>
          <span class="formula-result">{{ i18n.locale === 'ar' ? 'يُقرَّب لأقرب' : 'rounded to' }} {{ rounding }}</span>
        </div>
      </div>

      <p v-if="error" class="err-msg">{{ error }}</p>
    </div>

    <template #footer>
      <button class="dpc-btn dpc-btn-ghost back-btn" @click="router.push('/setup/2')">
        <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'" :size="15" :stroke-width="1.8" />
        {{ i18n.locale === 'ar' ? 'رجوع' : 'Back' }}
      </button>
      <DpcBtn variant="teal" :loading="saving" style="min-width:200px;" @click="complete">
        <DpcIcon name="Check" :size="15" :stroke-width="2.2" />
        {{ i18n.t('onboarding.completeSetup') || 'Complete setup' }}
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
.step-sub   { color: var(--ink-500); font-size: 15px; margin-bottom: 32px; max-width: 640px; line-height: 1.55; }

.form-stack { display: flex; flex-direction: column; gap: 22px; max-width: 560px; }

.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-wrap { display: flex; flex-direction: column; gap: 6px; }
.wide { max-width: 100%; }

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

.field-hint { font-size: 12px; color: var(--ink-500); }

.rounding-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.rounding-chip {
  height: 36px;
  min-width: 52px;
  padding: 0 14px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: var(--surface);
  color: var(--ink-700);
  box-shadow: inset 0 0 0 1px var(--line);
  transition: box-shadow 0.12s, background 0.12s;
  border: none;
}
.rounding-chip:hover:not(.chip-active) { background: var(--paper-2); }
.chip-active {
  background: var(--teal-50);
  color: var(--teal-700);
  box-shadow: inset 0 0 0 1.5px var(--teal-600);
}

.formula-box {
  padding: 14px 16px;
  border-radius: var(--r);
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px;
  color: var(--ink-600);
}
.formula-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--ink-700);
  margin-bottom: 8px;
}
.formula-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.formula-op   { color: var(--ink-400); font-weight: 700; }
.formula-val  { font-family: var(--font-mono); color: var(--teal-700); font-weight: 600; }
.formula-result { font-family: var(--font-mono); color: var(--ink-800); font-weight: 600; }
.formula-label { color: var(--ink-500); }

.back-btn { color: var(--ink-500); }
.err-msg  { color: var(--danger-700); font-size: 13px; }
</style>
