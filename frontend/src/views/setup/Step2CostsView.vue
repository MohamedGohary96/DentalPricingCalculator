<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import WizardShell from '@/components/WizardShell.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import { useI18nStore } from '@/stores/i18n.js'
import axios from 'axios'

const router = useRouter()
const i18n   = useI18nStore()
const api    = axios.create({ withCredentials: true })

const saving = ref(false)
const error  = ref('')

const rent             = ref(0)
const chairs           = ref(2)
const hours_per_day    = ref(8)
const days_per_month   = ref(22)
const utilization_pct  = ref(75)

async function next() {
  saving.value = true
  error.value  = ''
  try {
    await api.post('/api/onboarding/apply-template', {
      rent:   rent.value,
      chairs: chairs.value,
      hours:  hours_per_day.value,
      days:   days_per_month.value,
      util:   utilization_pct.value,
    })
    router.push('/setup/3')
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to save.'
  } finally {
    saving.value = false
  }
}

async function skipWithDefaults() {
  // Pre-fill with average values from 300+ clinics
  rent.value = 15000
  chairs.value = 2
  hours_per_day.value = 8
  days_per_month.value = 22
  utilization_pct.value = 75
  await next()
}
</script>

<template>
  <WizardShell :active-step="2">
    <div class="step-eyebrow">{{ i18n.locale === 'ar' ? 'الخطوة ٢ من ٣' : 'Step 2 of 3' }}</div>
    <h2 class="dpc-h step-title">
      {{ i18n.t('onboarding.costsTitle') || 'Costs & clinic capacity' }}
    </h2>
    <p class="step-sub">
      {{ i18n.t('onboarding.costsSub') || 'Your monthly rent and how many hours your clinic actually operates. These numbers drive every cost calculation.' }}
    </p>

    <div class="form-stack">
      <!-- Rent -->
      <div class="section-block">
        <div class="section-heading">
          <DpcIcon name="Building2" :size="16" :stroke-width="1.6" class="section-icon" />
          {{ i18n.locale === 'ar' ? 'الإيجار الشهري' : 'Monthly rent' }}
        </div>
        <div class="field-inner">
          <input
            v-model.number="rent"
            type="number"
            min="0"
            step="100"
            class="dpc-field-input"
            :placeholder="i18n.locale === 'ar' ? '٠' : '0'"
          />
        </div>
        <p class="field-hint">{{ i18n.t('onboarding.costsNote') || 'Enter your actual monthly rent. Other costs will be estimated from benchmarks.' }}</p>
      </div>

      <!-- Capacity -->
      <div class="section-block">
        <div class="section-heading capacity-heading">
          <DpcIcon name="Armchair" :size="16" :stroke-width="1.6" class="section-icon" />
          {{ i18n.t('onboarding.clinicCapacity') || 'Clinic capacity' }}
        </div>

        <div class="capacity-grid">
          <!-- Chairs -->
          <div class="field-wrap">
            <label class="dpc-field-label">
              <DpcIcon name="Armchair" :size="13" :stroke-width="1.6" />
              {{ i18n.locale === 'ar' ? 'عدد الكراسي' : 'Chairs' }}
            </label>
            <input v-model.number="chairs" type="number" min="1" max="20" class="dpc-field-input" />
          </div>

          <!-- Hours/day -->
          <div class="field-wrap">
            <label class="dpc-field-label">
              <DpcIcon name="Clock" :size="13" :stroke-width="1.6" />
              {{ i18n.locale === 'ar' ? 'ساعات/يوم' : 'Hours / day' }}
            </label>
            <input v-model.number="hours_per_day" type="number" min="1" max="24" step="0.5" class="dpc-field-input" />
          </div>

          <!-- Days/month -->
          <div class="field-wrap">
            <label class="dpc-field-label">
              <DpcIcon name="Calendar" :size="13" :stroke-width="1.6" />
              {{ i18n.locale === 'ar' ? 'أيام/شهر' : 'Days / month' }}
            </label>
            <input v-model.number="days_per_month" type="number" min="1" max="31" class="dpc-field-input" />
          </div>

          <!-- Utilization -->
          <div class="field-wrap">
            <label class="dpc-field-label">
              <DpcIcon name="TrendingUp" :size="13" :stroke-width="1.6" />
              {{ i18n.locale === 'ar' ? 'معدل الإشغال %' : 'Utilization %' }}
            </label>
            <input v-model.number="utilization_pct" type="number" min="0" max="100" class="dpc-field-input" />
          </div>
        </div>

        <!-- Live summary -->
        <div class="summary-row">
          <DpcIcon name="Info" :size="13" :stroke-width="1.6" />
          <span>
            {{ i18n.locale === 'ar' ? 'إجمالي الساعات التشغيليه الفعليه:' : 'Total Actual Operational Hours:' }}
            <strong class="dpc-num">
              {{ Math.round(chairs * hours_per_day * days_per_month * (utilization_pct / 100)) }}
            </strong>
          </span>
        </div>
      </div>

      <p v-if="error" class="err-msg">{{ error }}</p>
    </div>

    <template #footer>
      <DpcBtn
        variant="ghost"
        :icon="i18n.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'"
        @click="router.push('/setup/1')"
      >
        {{ i18n.locale === 'ar' ? 'رجوع' : 'Back' }}
      </DpcBtn>
      <DpcBtn
        variant="ghost"
        icon="FastForward"
        :disabled="saving"
        @click="skipWithDefaults"
      >
        {{ i18n.locale === 'ar' ? 'تخطي مع القيم الافتراضية' : 'Skip — use average values' }}
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
.step-sub   { color: var(--ink-500); font-size: 15px; margin-bottom: 32px; max-width: 640px; line-height: 1.55; }

.form-stack { display: flex; flex-direction: column; gap: 28px; max-width: 600px; }

.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-800);
}
.section-icon { color: var(--teal-600); }

.field-inner { position: relative; }
.dpc-field-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border-radius: var(--r);
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 15px;
  color: var(--ink-900);
  outline: none;
  border: none;
}
.dpc-field-input:focus { box-shadow: inset 0 0 0 1.5px var(--teal-600); }

.field-hint { font-size: 12px; color: var(--ink-500); }

.capacity-heading { margin-bottom: 4px; }

.capacity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field-wrap { display: flex; flex-direction: column; gap: 6px; }
.dpc-field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-600);
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--ink-600);
  padding-top: 4px;
}
.summary-row strong { color: var(--ink-900); margin-inline: 2px; }

.back-btn { color: var(--ink-500); }
.skip-btn {
  color: var(--accent-dark);
  font-size: 12px;
  padding: 0 16px;
}
.skip-btn:hover:not(:disabled) {
  background: var(--teal-50);
  color: var(--accent);
}
.err-msg  { color: var(--danger-700); font-size: 13px; }
</style>
