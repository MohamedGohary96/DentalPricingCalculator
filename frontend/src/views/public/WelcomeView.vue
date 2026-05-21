<script setup>
import { ref, computed, reactive } from 'vue'
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

// Calculator widget state
const calcInputs = reactive({ chairs: 3, hoursPerDay: 8, daysPerWeek: 5 })
const calcResult = ref(270)
const calcLoading = ref(false)

async function compute() {
  calcLoading.value = true
  try {
    const res = await pricingStore.computeCalc({
      chairs: calcInputs.chairs,
      hours_per_day: calcInputs.hoursPerDay,
      days_per_week: calcInputs.daysPerWeek,
    })
    if (res && res.chair_cost_per_hour) {
      calcResult.value = Math.round(res.chair_cost_per_hour)
    }
  } catch {
    // fallback stays at 270
  } finally {
    calcLoading.value = false
  }
}

const timeSlices = computed(() => [
  { l: '30 min', v: Math.round(calcResult.value * 0.5) },
  { l: '45 min', v: Math.round(calcResult.value * 0.75) },
  { l: '60 min', v: calcResult.value },
  { l: '90 min', v: Math.round(calcResult.value * 1.5) },
])

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

        <!-- Right: inline calculator widget -->
        <div class="calc-card">
          <div class="calc-card-top">
            <div class="eyebrow eyebrow-teal">{{ isAr ? 'حاسبة سريعة' : 'Try it · 30 sec' }}</div>
            <span class="calc-progress-label">3 / 3</span>
          </div>
          <div class="calc-progress-bar">
            <div class="calc-progress-fill" />
          </div>

          <!-- Inputs -->
          <div class="calc-inputs">
            <label class="calc-field">
              <span class="calc-field-label">{{ isAr ? 'عدد الكراسي' : 'Chairs' }}</span>
              <input
                v-model.number="calcInputs.chairs"
                type="number"
                min="1"
                max="20"
                class="calc-input"
                @change="compute"
              />
            </label>
            <label class="calc-field">
              <span class="calc-field-label">{{ isAr ? 'ساعات/يوم' : 'Hours / day' }}</span>
              <input
                v-model.number="calcInputs.hoursPerDay"
                type="number"
                min="2"
                max="16"
                class="calc-input"
                @change="compute"
              />
            </label>
            <label class="calc-field">
              <span class="calc-field-label">{{ isAr ? 'أيام/أسبوع' : 'Days / week' }}</span>
              <input
                v-model.number="calcInputs.daysPerWeek"
                type="number"
                min="1"
                max="7"
                class="calc-input"
                @change="compute"
              />
            </label>
          </div>

          <!-- Result -->
          <div class="calc-result-block">
            <div class="calc-result-num">
              <span class="dpc-num" :class="{ 'calc-loading': calcLoading }">{{ fmt(calcResult) }}</span>
              <span class="calc-result-unit">{{ i18n.t ? i18n.t('currency') || 'EGP' : 'EGP' }}/h</span>
            </div>
            <div class="calc-result-label">{{ isAr ? 'تكلفة كرسيك التشغيلية' : 'Your chair operating cost' }}</div>
          </div>

          <!-- Time slices -->
          <div class="calc-slices">
            <div v-for="s in timeSlices" :key="s.l" class="calc-slice">
              <div class="calc-slice-label">{{ s.l }}</div>
              <div class="dpc-num calc-slice-val">{{ fmt(s.v) }}</div>
            </div>
          </div>

          <!-- Warning note -->
          <div class="calc-warning">
            <b>{{ isAr ? 'هذا الأساس فقط.' : "That's just the floor." }}</b>
            {{ ' ' }}
            {{ isAr
              ? 'السعر الحقيقي = الكرسي + خامات + طبيب + ربحك. سجّل لترى قائمتك مُسعّرة بالكامل.'
              : 'Real price = chair + materials + doctor + your margin. Register to see your full menu priced.' }}
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

.calc-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.calc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calc-field-label {
  font-size: 11px;
  color: var(--ink-500);
  font-weight: 500;
}

.calc-input {
  width: 100%;
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
  outline: none;
  transition: box-shadow 0.15s;
}

.calc-input:focus {
  box-shadow: inset 0 0 0 2px var(--teal-500);
}

.calc-result-block {
  text-align: center;
  padding: 10px 0 14px;
}

.calc-result-num {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 60px;
  line-height: 1;
  color: var(--ink-900);
  letter-spacing: -0.03em;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0;
}

.calc-result-num .dpc-num { color: var(--ink-900); }
.calc-loading { opacity: 0.4; }

.calc-result-unit {
  font-size: 16px;
  color: var(--ink-500);
  font-family: var(--font-sans);
  margin-inline-start: 8px;
  font-weight: 500;
}

.calc-result-label {
  font-size: 13px;
  color: var(--ink-500);
  margin-top: 6px;
}

.calc-slices {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 18px;
}

.calc-slice {
  padding: 10px;
  border-radius: 10px;
  text-align: center;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
}

.calc-slice-label {
  font-size: 11px;
  color: var(--ink-500);
}

.calc-slice-val {
  font-weight: 600;
  font-size: 13px;
  color: var(--ink-900);
  margin-top: 2px;
}

.calc-warning {
  background: var(--warning-50, #fffbeb);
  border-radius: 10px;
  padding: 12px;
  font-size: 12px;
  color: var(--warning-700, #b45309);
  line-height: 1.5;
  box-shadow: inset 0 0 0 1px var(--warning-100, #fef3c7);
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
