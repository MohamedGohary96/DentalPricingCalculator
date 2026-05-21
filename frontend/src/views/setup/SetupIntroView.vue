<script setup>
import { useRouter } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useI18nStore } from '@/stores/i18n.js'

const router = useRouter()
const i18n   = useI18nStore()

const cards = [
  { n: 1, icon: 'Globe',            titleKey: 'intro_card_1_title', bodyKey: 'intro_card_1_body', titleEn: 'Location',         bodyEn: 'Country and city — sets your default currency and VAT rate.' },
  { n: 2, icon: 'Building2',        titleKey: 'intro_card_2_title', bodyKey: 'intro_card_2_body', titleEn: 'Costs & Capacity', bodyEn: 'Monthly rent, chairs, hours per day, days per month.' },
  { n: 3, icon: 'CircleDollarSign', titleKey: 'intro_card_3_title', bodyKey: 'intro_card_3_body', titleEn: 'Pricing defaults', bodyEn: 'Currency, VAT %, profit margin, and price rounding.' },
]

function cardTitle(c) {
  const t = i18n.t(`setup.${c.titleKey}`)
  return t.startsWith('setup.') ? c.titleEn : t
}

function cardBody(c) {
  const t = i18n.t(`setup.${c.bodyKey}`)
  return t.startsWith('setup.') ? c.bodyEn : t
}
</script>

<template>
  <div class="intro-shell">
    <!-- Topbar -->
    <header class="intro-topbar">
      <DpcLogo />
      <LangSwitch />
    </header>

    <!-- Body -->
    <div class="intro-body">
      <!-- Left: copy -->
      <div class="intro-left">
        <div class="intro-eyebrow">{{ i18n.locale === 'ar' ? 'إعداد العيادة' : 'Clinic setup' }}</div>
        <h1 class="dpc-h intro-title">
          {{ i18n.locale === 'ar'
            ? 'اعرف ماذا يكلّف كل كرسي. ثم سعّر للربح.'
            : 'Know what every chair costs. Then price to win.' }}
        </h1>
        <p class="intro-sub">
          {{ i18n.locale === 'ar'
            ? 'سنرشدك خلال ٣ خطوات قصيرة. أرقام معبّأة تلقائياً — لا تحتاج محاسب.'
            : 'We\'ll walk you through 3 short steps. Numbers are pre-filled — no accountant needed.' }}
        </p>
        <div class="intro-cta-row">
          <button class="dpc-btn dpc-btn-teal intro-cta" @click="router.push('/setup/1')">
            {{ i18n.locale === 'ar' ? 'ابدأ الإعداد ←' : "Let's start →" }}
            <DpcIcon :name="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
          </button>
        </div>
        <div class="intro-time">
          <DpcIcon name="Clock" :size="14" :stroke-width="1.6" />
          <span>{{ i18n.locale === 'ar' ? 'يستغرق حوالي ١٠ دقائق · معبّأ من ٣٠٠+ عيادة' : 'Takes about 10 minutes · pre-filled from 300+ clinics' }}</span>
        </div>
      </div>

      <!-- Right: 2x2 card grid -->
      <div class="intro-cards">
        <div v-for="card in cards" :key="card.n" class="dpc-panel intro-card">
          <div class="intro-card-header">
            <div class="intro-card-icon">
              <DpcIcon :name="card.icon" :size="18" :stroke-width="1.6" />
            </div>
            <span class="intro-card-step">STEP {{ String(card.n).padStart(2, '0') }}</span>
          </div>
          <div class="dpc-h intro-card-title">{{ cardTitle(card) }}</div>
          <div class="intro-card-body">{{ cardBody(card) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intro-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--paper);
}

.intro-topbar {
  height: 60px;
  padding: 0 28px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
}

.intro-body {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 20px 56px;
  gap: 40px;
}

.intro-left {
  flex: 1;
  padding-inline-end: 40px;
  max-width: 560px;
}

.intro-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--teal-700);
  background: var(--teal-50);
  padding: 4px 10px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px var(--teal-100);
  margin-bottom: 14px;
}

.intro-title {
  font-size: 44px;
  line-height: 1.1;
  margin-top: 0;
  margin-bottom: 18px;
}

.intro-sub {
  font-size: 16px;
  line-height: 1.6;
  color: var(--ink-600);
  margin-bottom: 28px;
}

.intro-cta-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 32px;
}

.intro-cta {
  height: 50px;
  padding: 0 22px;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.intro-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-500);
}

.intro-cards {
  flex: 1;
  max-width: 440px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.intro-card {
  padding: 22px;
}

.intro-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.intro-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px var(--teal-100);
  flex: none;
}

.intro-card-step {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-400);
  letter-spacing: 0.1em;
}

.intro-card-title {
  font-size: 16.5px;
  margin-bottom: 4px;
}

.intro-card-body {
  font-size: 13.5px;
  color: var(--ink-500);
  line-height: 1.5;
}
</style>
