<script setup>
import DpcLogo from '@/components/DpcLogo.vue'
import DpcIcon from '@/components/DpcIcon.vue'
import DpcWizardRail from '@/components/DpcWizardRail.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'
import { useRouter } from 'vue-router'

const props = defineProps({
  activeStep:     { type: Number,  default: 1 },
  showRail:       { type: Boolean, default: true },
  transitionDir:  { type: String,  default: 'forward' }, // 'forward' | 'back'
})

const i18n  = useI18nStore()
const router = useRouter()

const transitionName = computed(() =>
  props.transitionDir === 'back' ? 'wiz-step-back' : 'wiz-step'
)
</script>

<template>
  <div class="wiz-shell">
    <!-- Topbar -->
    <header class="wiz-topbar">
      <DpcLogo />
      <div class="wiz-topbar-end">
        <span class="wiz-setup-label">{{ i18n.locale === 'ar' ? 'إعداد العيادة' : 'Clinic setup' }}</span>
        <div class="wiz-divider" />
        <button class="dpc-btn dpc-btn-ghost wiz-save-btn" @click="router.push('/app/dashboard')">
          {{ i18n.locale === 'ar' ? 'حفظ وخروج' : 'Save & exit' }}
        </button>
        <LangSwitch />
      </div>
    </header>

    <!-- Body -->
    <div class="wiz-body">
      <!-- Rail -->
      <aside v-if="showRail" class="wiz-rail">
        <div class="wiz-rail-eyebrow">{{ i18n.t('setup.eyebrow') || 'Setup wizard' }}</div>
        <h3 class="dpc-h wiz-rail-title">{{ i18n.locale === 'ar' ? 'إعداد العيادة' : 'Setup wizard' }}</h3>
        <DpcWizardRail :active-step="activeStep" />
        <div class="wiz-rail-note">
          <div class="wiz-rail-note-title">
            <DpcIcon name="Info" :size="14" :stroke-width="1.6" />
            {{ i18n.locale === 'ar' ? 'ملحوظة سريعة' : 'A quick note' }}
          </div>
          <p>{{ i18n.locale === 'ar'
            ? 'أرقام معبّأة تلقائياً من متوسطات ٣٠٠+ عيادة مشابهة. عدّل ما لا يتطابق.'
            : 'Pre-filled numbers come from 300+ similar clinics. Tweak anything that doesn\'t match.' }}</p>
        </div>
      </aside>

      <!-- Content -->
      <div class="wiz-content">
        <Transition :name="transitionName" mode="out-in">
          <div class="wiz-content-inner" :key="activeStep">
            <slot />
          </div>
        </Transition>
      </div>
    </div>

    <!-- Footer -->
    <footer class="wiz-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.wiz-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--paper);
}

.wiz-topbar {
  height: 60px;
  padding: 0 28px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.wiz-topbar-end {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wiz-setup-label {
  font-size: 12.5px;
  color: var(--ink-500);
}

.wiz-divider {
  width: 1px;
  height: 18px;
  background: var(--line);
}

.wiz-save-btn {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--ink-600);
  box-shadow: inset 0 0 0 1px var(--line);
}

.wiz-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.wiz-rail {
  width: 280px;
  flex: none;
  background: var(--surface);
  border-inline-end: 1px solid var(--line);
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.wiz-rail-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--teal-700);
  margin-bottom: 4px;
}

.wiz-rail-title {
  font-size: 18px;
  margin-top: 10px;
  margin-bottom: 26px;
}

.wiz-rail-note {
  margin-top: auto;
  padding-top: 24px;
  background: var(--paper-2);
  border-radius: 12px;
  padding: 14px;
  font-size: 12.5px;
  color: var(--ink-600);
  box-shadow: inset 0 0 0 1px var(--line);
}

.wiz-rail-note-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--ink-800);
  margin-bottom: 4px;
}

.wiz-rail-note p {
  margin: 0;
  line-height: 1.55;
}

.wiz-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 44px 56px;
  min-width: 0;
}

.wiz-content-inner {
  max-width: 880px;
  margin: 0 auto;
}

/* Forward step transition */
.wiz-step-enter-active,
.wiz-step-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.wiz-step-enter-from { opacity: 0; transform: translateX(32px); }
.wiz-step-leave-to   { opacity: 0; transform: translateX(-32px); }

/* Back step transition */
.wiz-step-back-enter-active,
.wiz-step-back-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.wiz-step-back-enter-from { opacity: 0; transform: translateX(-32px); }
.wiz-step-back-leave-to   { opacity: 0; transform: translateX(32px); }

.wiz-footer {
  flex: none;
  height: 76px;
  padding: 0 56px 0 336px;
  background: var(--surface);
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
