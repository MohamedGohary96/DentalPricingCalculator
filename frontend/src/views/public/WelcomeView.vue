<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n.js'
import { usePricingStore } from '@/stores/pricing.js'
import DpcIcon from '@/components/DpcIcon.vue'
import DpcLogo from '@/components/DpcLogo.vue'
import LangSwitch from '@/components/LangSwitch.vue'

const router = useRouter()
const i18n = useI18nStore()
const pricingStore = usePricingStore()

const isAr = computed(() => i18n.locale === 'ar')

// 3-Step Calculator Wizard State
const currentStep = ref(1)
const calcSize = ref(null)  // 'small' | 'medium' | 'large'
const calcCity = ref(null)  // 'cairo' | 'alex' | 'delta' | 'upper' | 'gulf' | 'other'
const customCity = ref('')

const calcCosts = reactive({
  rent: 0,
  hours: 8,
  overhead: 0,
  staff: 0,
  dep: 0,
})

const calcResult = reactive({
  cph: 0,
  currency: 'EGP',
  total: 0,
})

// Clinic templates (from original calculator data)
const CALC_TEMPLATES = {
  small: {
    cairo: { chairs: 1, rent: 6000, overhead: 3500, staff: 2500, dep: 1200, cur: 'ج' },
    alex: { chairs: 1, rent: 4500, overhead: 2800, staff: 2000, dep: 1000, cur: 'ج' },
    delta: { chairs: 1, rent: 3500, overhead: 2200, staff: 1800, dep: 900, cur: 'ج' },
    upper: { chairs: 1, rent: 3000, overhead: 2000, staff: 1600, dep: 800, cur: 'ج' },
    gulf: { chairs: 1, rent: 8000, overhead: 5000, staff: 4000, dep: 2000, cur: 'ر.س' },
    other: { chairs: 1, rent: null, overhead: null, staff: null, dep: null, cur: 'ج' },
  },
  medium: {
    cairo: { chairs: 2, rent: 12000, overhead: 7000, staff: 6000, dep: 3000, cur: 'ج' },
    alex: { chairs: 2, rent: 9000, overhead: 5500, staff: 4500, dep: 2500, cur: 'ج' },
    delta: { chairs: 2, rent: 7000, overhead: 4500, staff: 3800, dep: 2000, cur: 'ج' },
    upper: { chairs: 2, rent: 6000, overhead: 4000, staff: 3500, dep: 1800, cur: 'ج' },
    gulf: { chairs: 2, rent: 16000, overhead: 10000, staff: 8000, dep: 4000, cur: 'ر.س' },
    other: { chairs: 2, rent: null, overhead: null, staff: null, dep: null, cur: 'ج' },
  },
  large: {
    cairo: { chairs: 3, rent: 20000, overhead: 12000, staff: 12000, dep: 6000, cur: 'ج' },
    alex: { chairs: 3, rent: 15000, overhead: 9000, staff: 9000, dep: 4500, cur: 'ج' },
    delta: { chairs: 3, rent: 12000, overhead: 7000, staff: 7000, dep: 3500, cur: 'ج' },
    upper: { chairs: 3, rent: 10000, overhead: 6000, staff: 6000, dep: 3000, cur: 'ج' },
    gulf: { chairs: 3, rent: 25000, overhead: 15000, staff: 15000, dep: 7000, cur: 'ر.س' },
    other: { chairs: 3, rent: null, overhead: null, staff: null, dep: null, cur: 'ج' },
  },
}

const calcTemplate = computed(() => {
  if (!calcSize.value || !calcCity.value) return null
  return CALC_TEMPLATES[calcSize.value]?.[calcCity.value] || null
})

const calcTotalCost = computed(() => {
  return (calcCosts.rent || 0) + (calcCosts.overhead || 0) + (calcCosts.staff || 0) + (calcCosts.dep || 0)
})

const calcProgressPercent = computed(() => (currentStep.value / 3) * 100)

const timeSlices = computed(() => [
  { l: isAr.value ? '٣٠ دقيقة' : '30 min', v: Math.round(calcResult.cph * 0.5) },
  { l: isAr.value ? '٤٥ دقيقة' : '45 min', v: Math.round(calcResult.cph * 0.75) },
  { l: isAr.value ? '٦٠ دقيقة' : '60 min', v: Math.round(calcResult.cph * 1.0) },
  { l: isAr.value ? '٩٠ دقيقة' : '90 min', v: Math.round(calcResult.cph * 1.5) },
])

// Watch for template changes → auto-fill costs
watch(calcTemplate, (tpl) => {
  if (!tpl) return
  calcCosts.rent = tpl.rent
  calcCosts.overhead = tpl.overhead
  calcCosts.staff = tpl.staff
  calcCosts.dep = tpl.dep
  calcResult.currency = tpl.cur === 'ر.س' ? 'SAR' : 'EGP'
})

function selectCalcSize(val) {
  calcSize.value = val
}

function selectCalcCity(val) {
  calcCity.value = val
}

function goCalcStep(step) {
  currentStep.value = step
}

function computeCalcResult() {
  if (!calcTemplate.value) return
  const tpl = calcTemplate.value
  const total = calcTotalCost.value
  const availHours = tpl.chairs * calcCosts.hours * 24 * 0.7
  const cph = availHours > 0 ? total / availHours : 0
  calcResult.cph = Math.round(cph)
  calcResult.total = total
  currentStep.value = 3
}

function restartCalc() {
  currentStep.value = 1
  calcSize.value = null
  calcCity.value = null
  customCity.value = ''
  calcCosts.rent = 0
  calcCosts.hours = 8
  calcCosts.overhead = 0
  calcCosts.staff = 0
  calcCosts.dep = 0
  calcResult.cph = 0
  calcResult.total = 0
}

// FAQ accordion
const faqOpen = ref(0)
const faqs = computed(() => [
  {
    q: isAr.value ? 'هل بياناتي خاصة؟' : 'Is my clinic data private?',
    a: isAr.value
      ? 'نعم. أرقامك لا تُشارك مع أي عيادة أخرى. نستخدم الإجماليات المُجمَّعة فقط للمعايير المرجعية.'
      : "Yes. Your numbers are never shared with any other clinic. We only use aggregated totals for the benchmarks.",
  },
  {
    q: isAr.value ? 'هل أحتاج محاسباً للإعداد؟' : 'Do I need an accountant to set it up?',
    a: isAr.value
      ? 'لا — معظم الأرقام معبّأة من متوسطات عيادات مشابهة. تحتاج فقط معرفة إيجارك.'
      : "No — most numbers are filled from averages of clinics like yours. You only need to know your rent.",
  },
  {
    q: isAr.value ? 'هل يدعم العملات والضريبة؟' : 'Does it support multiple currencies and VAT?',
    a: isAr.value
      ? 'نعم. ج.م، ر.س، د.إ، $ و€. ضريبة قابلة للتعديل وتدوير قابل للتخصيص.'
      : "Yes. EGP, SAR, AED, USD, EUR. Configurable VAT and per-clinic rounding.",
  },
  {
    q: isAr.value ? 'هل أستطيع الإلغاء في أي وقت؟' : 'Can I cancel any time?',
    a: isAr.value
      ? 'نعم. لا عقود سنوية. ادفع شهرياً أو سنوياً، وأغلق متى شئت.'
      : "Yes. No annual contracts. Pay monthly or yearly, close any time.",
  },
])

const howItWorks = computed(() => [
  { n: '01', icon: 'Building2', t: isAr.value ? 'ملف العيادة' : 'Clinic profile', d: isAr.value ? 'حجم، موقع، تخصص. ثلاث ضغطات.' : 'Size, location, specialty. Three clicks.' },
  { n: '02', icon: 'Coins', t: isAr.value ? 'التكاليف الثابتة' : 'Fixed costs', d: isAr.value ? 'معبّأة تلقائياً من ٣٠٠+ عيادة. أكّد الإيجار.' : 'Pre-filled from 300+ clinics. Confirm your rent.' },
  { n: '03', icon: 'Clock', t: isAr.value ? 'ساعات العمل' : 'Working hours', d: isAr.value ? 'أيام، ساعات، نسبة الاستغلال الواقعية.' : 'Days, hours, realistic utilisation.' },
  { n: '04', icon: 'List', t: isAr.value ? 'الخدمات' : 'Services', d: isAr.value ? 'إجراءاتك مع وقت الكرسي والخامات.' : 'Your procedures with chair time and materials.' },
])

const stats = computed(() => [
  { v: '312', l: isAr.value ? 'عيادة مشاركة' : 'contributing clinics' },
  { v: '8.4M', l: isAr.value ? 'بياناً سنوياً' : 'data points / yr' },
  { v: '26%', l: isAr.value ? 'متوسط رفع الهامش' : 'avg margin lift' },
  { v: '5 min', l: isAr.value ? 'للحصول على تكلفتك' : 'to your number' },
])

function fmt(n) {
  return n.toLocaleString()
}
</script>

<template>
  <div :class="['dpc-app', isAr && 'dpc-ar']" :dir="i18n.dir">

    <!-- ── Sticky Nav ──────────────────────────────────────────── -->
    <header class="nav-bar">
      <DpcLogo />
      <nav class="nav-links">
        <a href="#how-it-works">{{ isAr ? 'كيف تعمل' : 'How it works' }}</a>
        <a href="#pricing">{{ isAr ? 'التسعير' : 'Pricing' }}</a>
        <a href="#trust">{{ isAr ? 'العيادات' : 'Clinics' }}</a>
        <a href="#faq">{{ isAr ? 'الأسئلة' : 'FAQ' }}</a>
      </nav>
      <div class="nav-actions">
        <LangSwitch />
        <a class="nav-signin" @click="router.push('/login')">{{ isAr ? 'تسجيل الدخول' : 'Sign in' }}</a>
        <button class="dpc-btn dpc-btn-teal nav-cta" @click="router.push('/register')">
          {{ isAr ? 'ابدأ مجاناً' : 'Start free' }}
          <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="14" :stroke-width="2" />
        </button>
      </div>
    </header>

    <!-- ── Hero ───────────────────────────────────────────────── -->
    <section class="hero-section">
      <div class="hero-glow" />
      <div class="hero-inner">

        <!-- Left: headline + CTAs -->
        <div class="hero-left">
          <div class="eyebrow eyebrow-teal">
            {{ isAr ? 'ذكاء التسعير للعيادات' : 'Pricing intelligence for clinics' }}
          </div>
          <h1 class="hero-h1">
            {{ isAr ? 'تعرف تكلفة كل كرسي.' : 'Know what every chair costs.' }}
            <br />
            <span class="hero-h1-accent">{{ isAr ? 'ثم سعّر للربح.' : 'Then price to win.' }}</span>
          </h1>
          <p class="hero-sub">
            {{ isAr
              ? 'معظم العيادات تُسعّر بالتخمين. أداتنا تحسب تكلفة الساعة الفعلية للكرسي وتُريك أي الخدمات تكسب وأيها تخسر — في خمس دقائق.'
              : 'Most clinics price by gut. We compute your real chair-hour cost and show, service by service, which procedures earn and which bleed — in five minutes.' }}
          </p>
          <div class="hero-btns">
            <button class="dpc-btn dpc-btn-teal hero-btn-primary" @click="router.push('/register')">
              {{ isAr ? 'احسب تكلفة كرسيي مجاناً' : 'Calculate my chair cost — free' }}
              <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
            </button>
            <button class="dpc-btn dpc-btn-ghost hero-btn-demo">
              {{ isAr ? 'شاهد عرضاً (٢ دقيقة)' : 'Watch demo · 2 min' }}
            </button>
          </div>
          <div class="hero-checks">
            <div class="hero-check">
              <DpcIcon name="Check" :size="14" :stroke-width="2.4" class="check-icon" />
              {{ isAr ? 'بدون بطاقة ائتمان' : 'No credit card' }}
            </div>
            <div class="hero-check">
              <DpcIcon name="Check" :size="14" :stroke-width="2.4" class="check-icon" />
              {{ isAr ? 'بيانات إقليمية' : 'Region-specific data' }}
            </div>
            <div class="hero-check">
              <DpcIcon name="Check" :size="14" :stroke-width="2.4" class="check-icon" />
              {{ isAr ? 'العربية والإنجليزية' : 'Arabic & English' }}
            </div>
          </div>
        </div>

        <!-- Right: 3-step calculator wizard -->
        <div class="calc-card">
          <!-- Progress header -->
          <div class="calc-card-top">
            <div class="eyebrow eyebrow-teal">{{ isAr ? 'جرّبها — ٣٠ ثانية' : 'Try it · 30 sec' }}</div>
            <span class="calc-progress-label">{{ currentStep }} / 3</span>
          </div>
          <div class="calc-progress-bar">
            <div class="calc-progress-fill" :style="{ width: calcProgressPercent + '%' }" />
          </div>

          <!-- Step 1: Clinic Type Selection -->
          <div v-if="currentStep === 1" class="calc-step">
            <h3 class="calc-step-title">{{ isAr ? 'عيادتك من أي نوع؟' : 'What type of clinic?' }}</h3>
            <p class="calc-step-sub">{{ isAr ? 'سؤالان — وسنملأ ٨٠٪ تلقائياً' : 'Two questions — we\'ll auto-fill 80%' }}</p>

            <label class="calc-label">{{ isAr ? 'حجم العيادة' : 'Clinic size' }}</label>
            <div class="calc-chips">
              <button
                :class="['calc-chip', calcSize === 'small' && 'is-active']"
                @click="selectCalcSize('small')"
              >
                <span class="calc-chip-main">{{ isAr ? 'كرسي واحد' : '1 chair' }}</span>
                <span class="calc-chip-sub">{{ isAr ? 'طبيب ± مساعد' : 'Doctor ± assist' }}</span>
              </button>
              <button
                :class="['calc-chip', calcSize === 'medium' && 'is-active']"
                @click="selectCalcSize('medium')"
              >
                <span class="calc-chip-main">{{ isAr ? 'كرسيان' : '2 chairs' }}</span>
                <span class="calc-chip-sub">{{ isAr ? 'طبيب + مساعد' : 'Doctor + assist' }}</span>
              </button>
              <button
                :class="['calc-chip', calcSize === 'large' && 'is-active']"
                @click="selectCalcSize('large')"
              >
                <span class="calc-chip-main">{{ isAr ? '٣ كراسي+' : '3+ chairs' }}</span>
                <span class="calc-chip-sub">{{ isAr ? 'عيادة متكاملة' : 'Full clinic' }}</span>
              </button>
            </div>

            <label class="calc-label">{{ isAr ? 'موقع العيادة' : 'Clinic location' }}</label>
            <div class="calc-chips">
              <button :class="['calc-chip', calcCity === 'cairo' && 'is-active']" @click="selectCalcCity('cairo')">
                {{ isAr ? 'القاهرة / الجيزة' : 'Cairo / Giza' }}
              </button>
              <button :class="['calc-chip', calcCity === 'alex' && 'is-active']" @click="selectCalcCity('alex')">
                {{ isAr ? 'الإسكندرية' : 'Alexandria' }}
              </button>
              <button :class="['calc-chip', calcCity === 'delta' && 'is-active']" @click="selectCalcCity('delta')">
                {{ isAr ? 'الدلتا' : 'Delta' }}
              </button>
              <button :class="['calc-chip', calcCity === 'upper' && 'is-active']" @click="selectCalcCity('upper')">
                {{ isAr ? 'الصعيد' : 'Upper Egypt' }}
              </button>
              <button :class="['calc-chip', calcCity === 'gulf' && 'is-active']" @click="selectCalcCity('gulf')">
                {{ isAr ? 'الخليج' : 'Gulf' }}
              </button>
              <button :class="['calc-chip', calcCity === 'other' && 'is-active']" @click="selectCalcCity('other')">
                {{ isAr ? 'أخرى' : 'Other' }}
              </button>
            </div>

            <!-- Custom city input when "Other" is selected -->
            <div v-if="calcCity === 'other'" class="calc-other-wrap">
              <input
                v-model="customCity"
                type="text"
                class="calc-other-input"
                :placeholder="isAr ? 'اكتب مدينتك أو منطقتك…' : 'Type your city or region…'"
                autofocus
              />
            </div>

            <button
              class="dpc-btn dpc-btn-teal calc-btn-full"
              :disabled="!calcSize || !calcCity"
              @click="goCalcStep(2)"
            >
              {{ isAr ? 'التالي — شوف بياناتك' : 'Next — see your data' }}
              <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
            </button>
          </div>

          <!-- Step 2: Review Costs -->
          <div v-if="currentStep === 2" class="calc-step">
            <h3 class="calc-step-title">{{ isAr ? 'راجع بياناتك' : 'Review your costs' }}</h3>
            <p class="calc-step-sub">{{ isAr ? 'عدّل الإيجار حسب رقمك' : 'Adjust rent to your actual' }}</p>

            <div class="calc-cost-rows">
              <div class="calc-cost-row">
                <label>{{ isAr ? 'إيجار العيادة' : 'Clinic rent' }}</label>
                <input v-model.number="calcCosts.rent" type="number" min="0" step="100" class="calc-cost-input" />
              </div>
              <div class="calc-cost-row">
                <label>{{ isAr ? 'ساعات/يوم' : 'Hours / day' }}</label>
                <input v-model.number="calcCosts.hours" type="number" min="1" max="24" class="calc-cost-input" />
              </div>
              <div class="calc-cost-row">
                <label>
                  {{ isAr ? 'المرافق والإدارة' : 'Utilities & admin' }}
                  <span v-if="calcCity !== 'other'" class="calc-auto-badge">{{ isAr ? '✦ ملأناها' : '✦ auto' }}</span>
                </label>
                <input v-model.number="calcCosts.overhead" type="number" min="0" step="100" class="calc-cost-input" />
              </div>
              <div class="calc-cost-row">
                <label>
                  {{ isAr ? 'رواتب الموظفين' : 'Staff salaries' }}
                  <span v-if="calcCity !== 'other'" class="calc-auto-badge">{{ isAr ? '✦ ملأناها' : '✦ auto' }}</span>
                </label>
                <input v-model.number="calcCosts.staff" type="number" min="0" step="100" class="calc-cost-input" />
              </div>
              <div class="calc-cost-row">
                <label>
                  {{ isAr ? 'إهلاك المعدات' : 'Equipment depreciation' }}
                  <span v-if="calcCity !== 'other'" class="calc-auto-badge">{{ isAr ? '✦ ملأناها' : '✦ auto' }}</span>
                  <span class="tip-wrap">
                    <span class="tip-icon">?</span>
                    <span class="tip-box" :class="isAr ? 'tip-box-ltr' : ''">
                      {{ isAr
                        ? 'التكلفة الشهرية لمعداتك (كرسي، وحدة، أشعة…) موزعةً على سنوات عمرها الإنتاجي. مثال: معدات بـ١٢٠٬٠٠٠ جنيه على ١٠ سنوات = ١٬٠٠٠ جنيه/شهر.'
                        : 'Monthly cost of your equipment (chair, unit, X-ray…) spread over its useful life. E.g. equipment worth 120,000 over 10 years = 1,000/month.' }}
                    </span>
                  </span>
                </label>
                <input v-model.number="calcCosts.dep" type="number" min="0" step="100" class="calc-cost-input" />
              </div>
              <div class="calc-cost-row calc-cost-total">
                <label>{{ isAr ? 'الإجمالي شهرياً' : 'Total / month' }}</label>
                <span class="calc-total-val">{{ fmt(calcTotalCost) }}</span>
              </div>
            </div>

            <div class="calc-actions">
              <button class="dpc-btn dpc-btn-ghost calc-btn-back" @click="goCalcStep(1)">
                <DpcIcon :name="isAr ? 'ArrowRight' : 'ArrowLeft'" :size="16" />
                {{ isAr ? 'رجوع' : 'Back' }}
              </button>
              <button class="dpc-btn dpc-btn-teal calc-btn-compute" @click="computeCalcResult">
                {{ isAr ? 'احسب' : 'Compute' }}
                <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" />
              </button>
            </div>
          </div>

          <!-- Step 3: Result -->
          <div v-if="currentStep === 3" class="calc-step">
            <div class="calc-result-hero">
              <span class="dpc-num calc-result-num">{{ fmt(calcResult.cph) }}</span>
              <span class="calc-result-unit">{{ calcResult.currency }}/h</span>
              <div class="calc-result-label">{{ isAr ? 'تكلفة الكرسي التشغيلية' : 'Your chair operating cost' }}</div>
            </div>

            <div class="calc-info-box">
              <strong>{{ isAr ? 'هذا رقمك الأساسي — احفظه' : 'This is your base — remember it' }}</strong>
              <p>{{ isAr ? 'كل خدمة لازم تغطي هذا الأساس' : 'Every service must cover this floor' }}</p>
            </div>

            <div class="calc-time-grid">
              <div v-for="ts in timeSlices" :key="ts.l" class="calc-time-card">
                <span class="calc-time-label">{{ ts.l }}</span>
                <span class="dpc-num calc-time-val">{{ fmt(ts.v) }}</span>
              </div>
            </div>

            <div class="calc-warning-box">
              <strong>{{ isAr ? 'لكن ده مش السعر الكامل' : 'But this isn\'t the full price' }}</strong>
              <p>{{ isAr ? 'السعر = الكرسي + خامات + طبيب + ربح' : 'Price = chair + materials + doctor + margin' }}</p>
            </div>

            <div class="calc-cta-box">
              <strong>{{ isAr ? 'عايز السعر الصح لكل خدمة؟' : 'Want the right price per service?' }}</strong>
              <p>{{ isAr ? 'سجّل مجاناً — هنحسبلك كل حاجة' : 'Sign up free — we compute everything' }}</p>
              <button @click="router.push('/register')" class="dpc-btn dpc-btn-teal calc-cta-btn">
                {{ isAr ? 'سجّل مجاناً' : 'Start free' }}
                <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" />
              </button>
            </div>

            <button class="calc-restart" @click="restartCalc">
              ↺ {{ isAr ? 'أعد التجربة' : 'Try again' }}
            </button>
          </div>
        </div>

      </div>
    </section>

    <!-- ── How it works ──────────────────────────────────────── -->
    <section id="how-it-works" class="hiw-section">
      <div class="section-inner">
        <div class="section-header">
          <div class="eyebrow">{{ isAr ? 'كيف تعمل' : 'How it works' }}</div>
          <h2 class="section-h2">
            {{ isAr ? 'من التخمين إلى البيانات في أربع خطوات.' : 'From gut-feel to data in four steps.' }}
          </h2>
        </div>
        <div class="hiw-grid">
          <div v-for="s in howItWorks" :key="s.n" class="hiw-card">
            <div class="hiw-num">{{ s.n }}</div>
            <div class="hiw-icon-wrap">
              <DpcIcon :name="s.icon" :size="20" :stroke-width="1.6" />
            </div>
            <div class="hiw-title">{{ s.t }}</div>
            <div class="hiw-desc">{{ s.d }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Trust / Stats ─────────────────────────────────────── -->
    <section id="trust" class="trust-section">
      <div class="trust-glow" />
      <div class="section-inner trust-inner">
        <div class="section-header">
          <div class="eyebrow eyebrow-white">{{ isAr ? 'الثقة' : 'Trust' }}</div>
          <h2 class="section-h2 section-h2-white">
            {{ isAr ? 'مبني على بيانات حقيقية من المنطقة.' : 'Built on real, regional data.' }}
          </h2>
        </div>
        <div class="trust-stats">
          <div v-for="s in stats" :key="s.l" class="trust-stat">
            <div class="dpc-num trust-stat-val">{{ s.v }}</div>
            <div class="trust-stat-label">{{ s.l }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────── -->
    <section id="faq" class="faq-section">
      <div class="faq-inner">
        <div class="section-header">
          <div class="eyebrow">{{ isAr ? 'أسئلة شائعة' : 'FAQ' }}</div>
          <h2 class="section-h2">
            {{ isAr ? 'أهم الأسئلة، قبل أن تسأل.' : 'The questions, before you ask.' }}
          </h2>
        </div>
        <div class="faq-list">
          <div
            v-for="(f, i) in faqs"
            :key="i"
            class="faq-item dpc-panel"
            :class="{ 'faq-item-open': faqOpen === i }"
          >
            <button class="faq-q" @click="faqOpen = faqOpen === i ? -1 : i">
              <span>{{ f.q }}</span>
              <DpcIcon
                name="Plus"
                :size="18"
                :stroke-width="1.6"
                class="faq-icon"
                :class="{ 'faq-icon-open': faqOpen === i }"
              />
            </button>
            <div v-if="faqOpen === i" class="faq-a">{{ f.a }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Final CTA ──────────────────────────────────────────── -->
    <section class="cta-section">
      <div class="cta-card">
        <div class="cta-text">
          <div class="cta-headline">
            {{ isAr ? 'خمس دقائق من الآن، عندك قائمة مدافع عنها.' : 'Five minutes from now, a defensible price list.' }}
          </div>
          <div class="cta-sub">
            {{ isAr
              ? 'خطة مجانية للأبد · أحدث الإجراءات معبّأة · ادعم بالعربية'
              : 'Free plan forever · Common procedures pre-loaded · Arabic & English' }}
          </div>
        </div>
        <button class="dpc-btn cta-btn" @click="router.push('/register')">
          {{ isAr ? 'ابدأ مجاناً' : 'Start free' }}
          <DpcIcon :name="isAr ? 'ArrowLeft' : 'ArrowRight'" :size="16" :stroke-width="2" />
        </button>
      </div>
    </section>

    <!-- ── Footer ─────────────────────────────────────────────── -->
    <footer class="site-footer">
      <DpcLogo />
      <div class="footer-links">
        <a href="#">{{ isAr ? 'الشروط' : 'Terms' }}</a>
        <a href="#">{{ isAr ? 'الخصوصية' : 'Privacy' }}</a>
        <a href="#">{{ isAr ? 'تواصل' : 'Contact' }}</a>
      </div>
      <div class="footer-copy">© 2026 DentPrice</div>
    </footer>

  </div>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────────────────────── */
.dpc-app {
  min-height: 100vh;
  background: var(--paper);
  font-family: var(--font-sans);
  color: var(--ink-900);
}

/* ── Nav ───────────────────────────────────────────────────────── */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  padding: 0 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(250, 250, 247, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.nav-links {
  display: flex;
  gap: 26px;
  align-items: center;
  font-size: 13.5px;
  color: var(--ink-600);
}

.nav-links a {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: color 0.15s;
}
.nav-links a:hover { color: var(--teal-700); }

.nav-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nav-signin {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-800);
  cursor: pointer;
  text-decoration: none;
}
.nav-signin:hover { color: var(--teal-700); }

.nav-cta {
  height: 38px;
  padding: 0 14px;
  font-size: 13.5px;
}

/* ── Eyebrow ───────────────────────────────────────────────────── */
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-500);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
}

.eyebrow-teal {
  color: var(--teal-700);
  background: var(--teal-50);
  box-shadow: inset 0 0 0 1px var(--teal-100);
}

.eyebrow-white {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

/* ── Hero ──────────────────────────────────────────────────────── */
.hero-section {
  padding: 60px 36px 80px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--paper), rgba(13, 148, 136, 0.04) 80%, var(--paper));
}

.hero-glow {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(13, 148, 136, 0.1) 0%, transparent 60%);
  top: -200px;
  inset-inline-end: -100px;
  pointer-events: none;
}

.hero-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-left { display: flex; flex-direction: column; gap: 0; }

.hero-h1 {
  font-family: var(--font-head);
  font-size: 58px;
  line-height: 1.04;
  letter-spacing: -0.03em;
  margin-top: 16px;
  margin-bottom: 18px;
  max-width: 580px;
  color: var(--ink-900);
}

.hero-h1-accent { color: var(--teal-700); }

.hero-sub {
  font-size: 17px;
  line-height: 1.55;
  color: var(--ink-600);
  margin-bottom: 28px;
  max-width: 520px;
}

.hero-btns {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 26px;
}

.hero-btn-primary { height: 52px; padding: 0 22px; font-size: 15px; }
.hero-btn-demo { color: var(--ink-700); height: 52px; }

.hero-checks {
  display: flex;
  gap: 28px;
  align-items: center;
  font-size: 12.5px;
  color: var(--ink-500);
}

.hero-check {
  display: flex;
  gap: 6px;
  align-items: center;
}

.check-icon { color: var(--teal-700); }

/* ── Calculator Card ───────────────────────────────────────────── */
.calc-card {
  background: var(--surface);
  border-radius: 20px;
  padding: 26px;
  box-shadow: var(--shadow-lg), inset 0 0 0 1px var(--line);
}

.calc-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.calc-progress-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-400);
}

.calc-progress-bar {
  height: 4px;
  background: var(--paper-2);
  border-radius: 999px;
  margin-bottom: 20px;
  overflow: hidden;
}

.calc-progress-fill {
  width: 100%;
  height: 100%;
  background: var(--teal-600);
}

/* Calculator wizard steps */
.calc-step {
  animation: calcFadeIn 0.3s ease;
}

@keyframes calcFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.calc-step-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink-900);
  margin-bottom: 6px;
  line-height: 1.3;
}

.calc-step-sub {
  font-size: 13px;
  color: var(--ink-500);
  margin-bottom: 20px;
  line-height: 1.4;
}

.calc-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-700);
  margin-bottom: 8px;
}

.calc-chips {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.calc-chip {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--line);
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calc-chip:hover {
  border-color: var(--teal-400);
  background: var(--teal-50);
}

.calc-chip.is-active {
  border-color: var(--teal-600);
  background: var(--teal-50);
  box-shadow: 0 0 0 3px var(--teal-100);
}

.calc-chip-main {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.calc-chip-sub {
  font-size: 11px;
  color: var(--ink-500);
}

.calc-btn-full {
  width: 100%;
  justify-content: center;
  height: 44px;
}

.calc-btn-full:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.calc-other-wrap {
  animation: fade-in-down .15s ease;
}
.calc-other-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1.5px var(--teal-600);
  font-size: 13.5px;
  color: var(--ink-900);
  outline: none;
  border: none;
}
.calc-other-input::placeholder { color: var(--ink-400); }
.calc-other-input:focus { box-shadow: inset 0 0 0 2px var(--teal-600), 0 0 0 3px rgba(13,148,136,.12); }
@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: none; }
}

/* Step 2: Cost rows */
.calc-cost-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.calc-cost-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calc-cost-row label {
  font-size: 13px;
  color: var(--ink-700);
  font-weight: 500;
  display: flex;
  align-items: center;
}

.calc-auto-badge {
  font-size: 10px;
  color: var(--teal-600);
  font-weight: 500;
  margin-left: 4px;
}

.tip-wrap { position: relative; display: inline-flex; align-items: center; margin-inline-start: 5px; }
.tip-icon {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--ink-200); color: var(--ink-600);
  font-size: 9px; font-weight: 700;
  display: grid; place-items: center; cursor: default;
  flex-shrink: 0; line-height: 1;
  transition: background .12s, color .12s;
}
.tip-wrap:hover .tip-icon { background: var(--teal-600); color: #fff; }
.tip-box {
  position: absolute;
  bottom: calc(100% + 8px);
  inset-inline-start: 50%;
  transform: translateX(-50%);
  width: 230px;
  background: var(--ink-900);
  color: #fff;
  font-size: 11.5px;
  font-weight: 400;
  line-height: 1.55;
  padding: 10px 12px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.28);
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s;
  z-index: 200;
  white-space: normal;
  text-align: start;
}
.tip-box::after {
  content: '';
  position: absolute;
  top: 100%; left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--ink-900);
}
.tip-box-ltr { direction: ltr; text-align: start; }
.tip-wrap:hover .tip-box { opacity: 1; }

.calc-cost-input {
  width: 110px;
  height: 36px;
  padding: 0 10px;
  border-radius: var(--r);
  border: none;
  box-shadow: inset 0 0 0 1px var(--line);
  background: var(--paper);
  font-size: 14px;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--ink-900);
  text-align: right;
  outline: none;
  transition: box-shadow 0.15s;
}

.calc-cost-input:focus {
  box-shadow: inset 0 0 0 2px var(--teal-500);
}

.calc-cost-total {
  border-top: 2px solid var(--line);
  padding-top: 12px;
  margin-top: 8px;
}

.calc-total-val {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-900);
  font-family: var(--font-mono);
}

.calc-actions {
  display: flex;
  gap: 8px;
}

.calc-btn-back {
  flex: 0;
}

.calc-btn-compute {
  flex: 1;
}

/* Step 3: Result */
.calc-result-hero {
  text-align: center;
  padding: 24px 0;
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}

.calc-result-num {
  font-size: 56px;
  font-weight: 800;
  color: var(--teal-600);
  line-height: 1;
}

.calc-result-unit {
  font-size: 18px;
  color: var(--ink-500);
  font-weight: 500;
  margin-left: 6px;
}

.calc-result-label {
  font-size: 13px;
  color: var(--ink-600);
  margin-top: 8px;
}

.calc-info-box,
.calc-warning-box,
.calc-cta-box {
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 14px;
}

.calc-info-box {
  background: var(--teal-50);
  border: 1px solid var(--teal-200);
}

.calc-info-box strong,
.calc-warning-box strong,
.calc-cta-box strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
  margin-bottom: 4px;
}

.calc-info-box p,
.calc-warning-box p,
.calc-cta-box p {
  font-size: 12px;
  color: var(--ink-600);
  line-height: 1.5;
  margin: 0;
}

.calc-warning-box {
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
}

.calc-cta-box {
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.calc-cta-btn {
  width: 100%;
  justify-content: center;
  margin-top: 10px;
}

.calc-time-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.calc-time-card {
  padding: 10px;
  border-radius: 8px;
  background: var(--paper);
  border: 1px solid var(--line);
  text-align: center;
}

.calc-time-label {
  display: block;
  font-size: 11px;
  color: var(--ink-500);
  margin-bottom: 4px;
}

.calc-time-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-900);
}

.calc-restart {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--ink-500);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.calc-restart:hover {
  background: var(--paper-2);
  color: var(--ink-900);
}

/* ── How it works ──────────────────────────────────────────────── */
.section-inner {
  max-width: 1180px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.section-h2 {
  font-family: var(--font-head);
  font-size: 36px;
  line-height: 1.15;
  color: var(--ink-900);
  margin: 0;
}

.section-h2-white { color: #fff; }

.hiw-section {
  padding: 60px 36px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.hiw-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.hiw-card {
  padding: 24px;
  border-radius: 16px;
  background: var(--paper);
  box-shadow: inset 0 0 0 1px var(--line);
}

.hiw-num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-400);
  letter-spacing: 0.1em;
  margin-bottom: 14px;
}

.hiw-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--teal-50);
  color: var(--teal-700);
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  box-shadow: inset 0 0 0 1px var(--teal-100);
}

.hiw-title {
  font-family: var(--font-head);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink-900);
  margin-bottom: 6px;
}

.hiw-desc {
  font-size: 13.5px;
  color: var(--ink-500);
  line-height: 1.55;
}

/* ── Trust / Stats ─────────────────────────────────────────────── */
.trust-section {
  padding: 70px 36px;
  background: linear-gradient(165deg, #0a1424, #0f2545 100%);
  color: #fff;
  position: relative;
  overflow: hidden;
}

.trust-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(13, 148, 136, 0.18) 0%, transparent 60%);
  top: -200px;
  inset-inline-start: -200px;
  pointer-events: none;
}

.trust-inner { position: relative; }

.trust-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28px;
  text-align: center;
}

.trust-stat-val {
  font-family: var(--font-mono);
  font-size: 44px;
  font-weight: 600;
  color: #5ee0b9;
  letter-spacing: -0.02em;
}

.trust-stat-label {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 6px;
}

/* ── FAQ ───────────────────────────────────────────────────────── */
.faq-section {
  padding: 70px 36px;
  background: var(--paper);
}

.faq-inner {
  max-width: 880px;
  margin: 0 auto;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.faq-item {
  padding: 18px 22px;
  border-radius: var(--r-md, 12px);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
}

.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-weight: 500;
  font-size: 15px;
  color: var(--ink-900);
  font-family: var(--font-sans);
  text-align: start;
  gap: 12px;
}

.faq-icon {
  color: var(--ink-500);
  flex: none;
  transition: transform 0.2s;
}

.faq-icon-open { transform: rotate(45deg); }

.faq-a {
  margin-top: 10px;
  color: var(--ink-600);
  font-size: 13.5px;
  line-height: 1.6;
  max-width: 720px;
}

/* ── Final CTA ─────────────────────────────────────────────────── */
.cta-section {
  padding: 60px 36px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.cta-card {
  max-width: 980px;
  margin: 0 auto;
  padding: 44px 56px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--teal-700), var(--teal-600));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
}

.cta-headline {
  font-family: var(--font-head);
  font-size: 28px;
  color: #fff;
  margin-bottom: 6px;
  font-weight: 600;
}

.cta-sub {
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
}

.cta-btn {
  background: #fff;
  color: var(--teal-700);
  height: 52px;
  font-size: 15px;
  padding: 0 22px;
  font-weight: 600;
  flex: none;
}
.cta-btn:hover { background: rgba(255, 255, 255, 0.92); }

/* ── Footer ────────────────────────────────────────────────────── */
.site-footer {
  padding: 28px 36px;
  background: var(--surface);
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--ink-500);
}

.footer-links {
  display: flex;
  gap: 22px;
}

.footer-links a {
  color: var(--ink-500);
  text-decoration: none;
  cursor: pointer;
}
.footer-links a:hover { color: var(--teal-700); }

.footer-copy { color: var(--ink-400); }
</style>
