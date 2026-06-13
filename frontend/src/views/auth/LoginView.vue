<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DpcLogo from '@/components/DpcLogo.vue'
import DpcBtn from '@/components/DpcBtn.vue'
import DpcField from '@/components/DpcField.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import TrustBadge from '@/components/TrustBadge.vue'
import AuthHeroCard from '@/components/AuthHeroCard.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'

const router = useRouter()
const auth   = useAuthStore()
const i18n   = useI18nStore()

const username   = ref('')
const password   = ref('')
const remember   = ref(false)
const showPass   = ref(false)
const error      = ref('')
const submitting = ref(false)

// Load saved username on mount
onMounted(() => {
  const savedUsername = localStorage.getItem('dpc_remember_username')
  if (savedUsername) {
    username.value = savedUsername
    remember.value = true
  }
})

async function submit() {
  if (!username.value || !password.value) { error.value = 'Please fill in all fields.'; return }
  submitting.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)

    // Save or clear username based on remember me
    if (remember.value) {
      localStorage.setItem('dpc_remember_username', username.value)
    } else {
      localStorage.removeItem('dpc_remember_username')
    }

    const oc = auth.user?.onboarding_completed
    router.push(oc === 0 || oc === false ? '/setup' : '/app/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Login failed.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-screen">
    <!-- LEFT: Navy hero -->
    <div class="hero dpc-hero-dots">
      <!-- glow blobs -->
      <div class="glow-teal" />
      <div class="glow-navy" />

      <div class="hero-top">
        <DpcLogo :on-dark="true" />
      </div>

      <div class="hero-body">
        <!-- Floating testimonial card -->
        <AuthHeroCard
          variant="testimonial"
          title=""
          :content="i18n.locale === 'ar' ? 'وفّرت ٢٦٪ من تكاليفنا الشهرية بفضل رؤى التسعير الدقيقة.' : 'Saved 26% on monthly overhead thanks to accurate pricing insights.'"
          :author="i18n.locale === 'ar' ? 'د. أحمد — القاهرة' : 'Dr. Ahmed — Cairo'"
          :delay="300"
        />

        <div class="eyebrow-pill">{{ i18n.locale === 'ar' ? 'ذكاء العيادة' : 'Clinic Intelligence' }}</div>
        <h1 class="dpc-h hero-title">{{ i18n.locale === 'ar' ? 'أوقف خسارة المال على الخدمات' : 'Stop losing money on services' }}</h1>
        <p class="hero-body-text">{{ i18n.locale === 'ar' ? 'اكتشف التكاليف الحقيقية لعيادتك واحصل على أسعار مربحة لكل خدمة — مبني على بيانات ٣٠٠+ عيادة.' : 'Discover your clinic\'s real costs and get profitable prices for every service — backed by 300+ clinics.' }}</p>
        <div class="bullets">
          <div v-for="(b, i) in (i18n.locale === 'ar'
            ? ['تكلفة ساعة الكرسي الدقيقة لعيادتك', 'اكتشف الخدمات ناقصة السعر على الفور', 'أسعار مربحة تلقائياً لكل خدمة']
            : ['Know your exact chair-hour cost', 'Spot underpriced services instantly', 'Get profitable prices automatically'])"
            :key="i" class="bullet">
            <div class="bullet-dot"><DpcIcon name="Check" :size="12" :stroke-width="2.4" /></div>
            <span>{{ b }}</span>
          </div>
        </div>
      </div>

      <div class="hero-footer">
        <DpcIcon name="Sparkles" :size="14" :stroke-width="1.6" />
        <span>{{ i18n.locale === 'ar' ? 'بياناتك مشفرة ولن تُشارك مع أحد.' : 'Your data is encrypted and never shared.' }}</span>
      </div>
    </div>

    <!-- RIGHT: Form panel -->
    <div class="form-panel">
      <div class="form-topbar">
        <LangSwitch />
      </div>

      <div class="form-body">
        <h2 class="dpc-h form-title">
          {{ i18n.locale === 'ar' ? 'مرحباً ' : 'Welcome ' }}
          <span class="text-teal">{{ i18n.locale === 'ar' ? 'بعودتك' : 'back' }}</span>
        </h2>
        <p class="form-sub">{{ i18n.locale === 'ar' ? 'أدخل بياناتك للمتابعة.' : 'Enter your details below.' }}</p>

        <form class="fields" @submit.prevent="submit">
          <DpcField
            :label="i18n.t('auth.username') || 'Username or email'"
            icon="User"
            v-model="username"
            placeholder="you@clinic.com"
          />
          <div class="pass-wrap">
            <DpcField
              :label="i18n.t('auth.password') || 'Password'"
              icon="Lock"
              :type="showPass ? 'text' : 'password'"
              v-model="password"
              placeholder="••••••••"
              :error="error"
            />
            <DpcBtn
              variant="ghost"
              size="xs"
              square
              :icon="showPass ? 'EyeOff' : 'Eye'"
              :aria-label="showPass ? 'Hide password' : 'Show password'"
              class="eye-btn"
              @click="showPass = !showPass"
            />
          </div>

          <div class="row-between">
            <label class="remember">
              <span class="checkbox" :class="remember && 'checked'" @click="remember = !remember">
                <DpcIcon v-if="remember" name="Check" :size="10" :stroke-width="3" />
              </span>
              {{ i18n.locale === 'ar' ? 'تذكرني' : 'Remember me' }}
            </label>
            <router-link to="/forgot-password" class="forgot">
              {{ i18n.t('auth.forgotPassword') || 'Forgot password?' }}
            </router-link>
          </div>

          <DpcBtn
            type="submit"
            variant="primary"
            size="lg"
            :trailing-icon="i18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'"
            :loading="submitting"
            :full="true"
            style="margin-top:6px;"
          >
            {{ i18n.t('auth.login') }}
          </DpcBtn>
        </form>

        <!-- Quick benefits -->
        <div class="quick-benefits">
          <div class="benefit-item">
            <DpcIcon name="TrendingUp" :size="14" :stroke-width="1.8" />
            <span>{{ i18n.locale === 'ar' ? 'أسعار مربحة' : 'Profitable pricing' }}</span>
          </div>
          <div class="benefit-item">
            <DpcIcon name="PieChart" :size="14" :stroke-width="1.8" />
            <span>{{ i18n.locale === 'ar' ? 'تحليل التكاليف' : 'Cost analysis' }}</span>
          </div>
          <div class="benefit-item">
            <DpcIcon name="AlertCircle" :size="14" :stroke-width="1.8" />
            <span>{{ i18n.locale === 'ar' ? 'كشف نقص الأسعار' : 'Underpricing alerts' }}</span>
          </div>
        </div>

        <div class="or-divider">
          <div class="or-line" /><span>{{ i18n.t('common.or') || 'or' }}</span><div class="or-line" />
        </div>

        <!-- Premium register CTA -->
        <router-link to="/register" class="register-cta">
          <div class="cta-content">
            <div class="cta-eyebrow">{{ i18n.t('auth.noAccount') || 'New to DPC?' }}</div>
            <div class="cta-title">{{ i18n.locale === 'ar' ? 'أنشئ حسابك مجاناً' : 'Create your free clinic account' }}</div>
          </div>
          <DpcIcon :name="i18n.locale === 'ar' ? 'ArrowLeft' : 'ArrowRight'" :size="18" :stroke-width="2" />
        </router-link>

        <!-- Trust badges -->
        <div class="trust-badges">
          <TrustBadge icon="Lock" :label="i18n.locale === 'ar' ? 'مشفر SSL' : 'SSL Encrypted'" size="sm" />
          <TrustBadge icon="Shield" :label="i18n.locale === 'ar' ? 'أمان بنكي' : 'Secure'" size="sm" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-screen {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* ── Hero ── */
.hero {
  flex: 1;
  min-width: 0;
  position: relative;
  background: linear-gradient(165deg, #0a1424 0%, #0f2545 60%, #163058 100%);
  color: #fff;
  padding: 44px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}
.glow-teal {
  position: absolute;
  width: 540px; height: 540px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(13,148,136,.32) 0%, transparent 60%);
  bottom: -240px; inset-inline-end: -180px;
  filter: blur(8px);
  pointer-events: none;
}
.glow-navy {
  position: absolute;
  width: 380px; height: 380px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(75,115,165,.22) 0%, transparent 60%);
  top: -160px; inset-inline-start: -120px;
  pointer-events: none;
}
.hero-top { position: relative; z-index: 1; }
.hero-body { position: relative; z-index: 1; max-width: 460px; }
.hero-footer {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 10px;
  color: rgba(255,255,255,.5); font-size: 12.5px;
}

.eyebrow-pill {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(94,224,185,.14);
  color: #5ee0b9;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: .06em;
  text-transform: uppercase;
  border: 1px solid rgba(94,224,185,.22);
  margin-bottom: 28px;
}
.hero-title {
  font-size: 46px;
  line-height: 1.08;
  color: #fff;
  margin-bottom: 18px;
  letter-spacing: -0.025em;
}
.hero-body-text {
  font-size: 16px;
  line-height: 1.55;
  color: rgba(255,255,255,.72);
  margin-bottom: 32px;
  max-width: 420px;
}
.bullets { display: flex; flex-direction: column; gap: 14px; }
.bullet {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: rgba(255,255,255,.85);
  font-size: 14px;
}
.bullet-dot {
  flex: none;
  width: 22px; height: 22px;
  border-radius: 999px;
  background: rgba(94,224,185,.18);
  color: #5ee0b9;
  display: grid;
  place-items: center;
}

/* ── Form panel ── */
.form-panel {
  width: 500px;
  flex: none;
  background: var(--paper);
  padding: 44px 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow-y: auto;
}
.form-topbar {
  position: absolute;
  top: 28px;
  inset-inline-end: 28px;
}
.form-body { display: flex; flex-direction: column; }
.form-title { font-size: 32px; margin-bottom: 8px; letter-spacing: -0.02em; }
.form-sub   { color: var(--ink-500); font-size: 14.5px; margin-bottom: 28px; }

.fields { display: flex; flex-direction: column; gap: 16px; }

.pass-wrap { position: relative; }
.eye-btn {
  position: absolute;
  inset-inline-end: 12px;
  top: 50%;
  transform: translateY(-50%) translateY(11px);
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-600);
  font-size: 13.5px;
  cursor: pointer;
}
.checkbox {
  width: 18px; height: 18px;
  border-radius: 5px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1.5px var(--line);
  display: grid;
  place-items: center;
  flex: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.checkbox:hover { box-shadow: inset 0 0 0 1.5px var(--ink-400); }
.checkbox.checked {
  background: var(--teal-600);
  box-shadow: inset 0 0 0 1.5px var(--teal-600);
  color: #fff;
}
.forgot { color: var(--teal-700); font-size: 13.5px; font-weight: 500; }

/* Quick benefits strip */
.quick-benefits {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
  padding: 12px;
  background: var(--paper-2);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}
.benefit-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-600);
  font-size: 12px;
  font-weight: 500;
}

.or-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
  color: var(--ink-400);
  font-size: 12px;
}
.or-line { flex: 1; height: 1px; background: var(--line); }

/* Premium register CTA */
.register-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--teal-600), var(--teal-700));
  color: #fff;
  text-decoration: none;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
  margin-bottom: 16px;
}
.register-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.3);
}
.cta-eyebrow {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
  margin-bottom: 2px;
}
.cta-title {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Trust badges */
.trust-badges {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ──────────────────────────────────────────────────────────────
   RESPONSIVE — collapse two-pane layout to a single column below
   the lg breakpoint. The navy hero becomes a compact banner and
   the form fills the rest. Backdrop-filter on the floating card
   stays on tablet portrait but is dropped on phones for perf.
   ────────────────────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .auth-screen {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    min-height: 100svh;
    overflow: visible;
  }

  .hero {
    flex: none;
    padding: 28px var(--gutter, 24px);
    gap: 16px;
  }
  .hero-body { max-width: 540px; }
  .hero-title { font-size: 30px; margin-bottom: 12px; }
  .hero-body-text { margin-bottom: 18px; }

  /* Decorative glows can sit outside the smaller container without
     producing horizontal scroll — global overflow-x guard catches it. */

  .form-panel {
    width: 100%;
    padding: 24px var(--gutter, 24px) 32px;
    overflow-y: visible;
  }
  .form-topbar {
    position: static;
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }
}

@media (max-width: 767px) {
  .hero {
    padding: 20px var(--gutter, 16px);
    gap: 12px;
  }
  /* Compress hero to a tight banner: keep logo, eyebrow, headline.
     Hide the marketing bullets, body copy, and trust footer — the
     form is what users came here for. */
  .hero-body-text,
  .bullets,
  .hero-footer,
  .auth-hero-card { display: none; }

  .hero-title {
    font-size: 24px;
    line-height: 1.2;
    margin-bottom: 0;
  }
  .eyebrow-pill { margin-bottom: 12px; }

  .glow-teal,
  .glow-navy { display: none; }

  .form-title { font-size: 26px; }
  .form-sub   { margin-bottom: 20px; }
  .fields     { gap: 14px; }

  .quick-benefits { gap: 12px; padding: 10px; }
  .benefit-item   { font-size: 11.5px; }
}
</style>
