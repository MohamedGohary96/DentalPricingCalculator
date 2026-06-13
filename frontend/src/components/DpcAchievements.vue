<script setup>
/**
 * DpcAchievements — horizontal badge strip, 4-per-row desktop, 2 mobile.
 * Unlocked: full color with pop animation.
 * Locked: grayscale with "?" hint.
 */
import { computed, watch } from 'vue'
import { useI18nStore }    from '@/stores/i18n.js'

const props = defineProps({
  achievements: { type: Array, default: () => [] },
})

const i18n = useI18nStore()
const isAr = computed(() => i18n.locale === 'ar')

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isAr.value
    ? d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="ach-root">
    <div class="ach-header">
      <span class="ach-title">{{ isAr ? 'الإنجازات' : 'Achievements' }}</span>
      <span class="ach-count">
        {{ achievements.filter(a => a.unlocked).length }} / {{ achievements.length }}
      </span>
    </div>

    <div class="ach-grid">
      <div
        v-for="badge in achievements"
        :key="badge.id"
        :class="['ach-badge', badge.unlocked ? 'is-unlocked' : 'is-locked']"
      >
        <div class="badge-icon" :class="badge.unlocked ? 'icon-unlocked' : 'icon-locked'">
          <span v-if="badge.unlocked" class="badge-emoji">{{ badge.icon }}</span>
          <span v-else class="badge-q">?</span>
        </div>
        <div class="badge-body">
          <div class="badge-name">{{ badge.label }}</div>
          <div v-if="badge.unlocked" class="badge-date">
            {{ fmtDate(badge.unlockedAt) }}
          </div>
          <div v-else class="badge-hint">
            {{ isAr ? 'مقفل' : 'Locked' }}
          </div>
        </div>
        <div class="badge-tooltip" :dir="isAr ? 'rtl' : 'ltr'">
          <span v-if="!badge.unlocked" class="tooltip-how">{{ isAr ? 'كيف تحصل عليه:' : 'How to earn:' }}</span>
          {{ badge.desc }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ach-root {
  background: var(--surface-1);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  padding: 20px 24px;
}

.ach-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.ach-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-500);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ach-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-dark);
  font-family: var(--font-mono);
}

/* ── Grid ─────────────────────────────────────────────────────── */
.ach-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

/* Tablet portrait gets 2-up so badges aren't crammed. */
@media (max-width: 1023px) and (min-width: 481px) {
  .ach-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Below sm the badge strip becomes a horizontal snap-scroll. This
   preserves vertical density on phones while keeping each badge
   fully tappable and skimmable. Tooltips lose their hover state
   on touch — they remain for desktop. */
@media (max-width: 480px) {
  .ach-root { padding: 16px var(--gutter, 16px); }

  .ach-grid {
    display: flex;
    grid-template-columns: none;
    gap: 10px;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: var(--gutter, 16px);
    /* Bleed the strip to the card edges so the first/last badge
       reach the visual edge of the parent card without padding. */
    margin-inline: calc(var(--gutter, 16px) * -1);
    padding-inline: var(--gutter, 16px);
  }

  .ach-badge {
    flex: 0 0 auto;
    min-width: 140px;
    scroll-snap-align: start;
  }

  /* Tooltip on touch devices is hidden — relies on hover. The
     badge name + locked/unlocked state already communicates the
     core info. */
  .badge-tooltip { display: none; }
}

/* ── Badge card ───────────────────────────────────────────────── */
.ach-badge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 10px;
  border-radius: var(--r);
  text-align: center;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
  cursor: default;
}

.ach-badge.is-unlocked {
  background: var(--surface-1);
  border: 1px solid var(--accent-dim);
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.12);
  animation: badge-pop 0.4s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
}

.ach-badge.is-locked {
  background: var(--surface-2);
  border: 1px solid var(--line);
  opacity: 0.5;
}

.ach-badge.is-unlocked:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 6px 16px rgba(6, 182, 212, 0.2);
}

/* ── Badge icon ───────────────────────────────────────────────── */
.badge-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex: none;
}

.icon-unlocked {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.05));
  box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.2), 0 2px 8px rgba(6, 182, 212, 0.15);
}

.icon-locked {
  background: var(--surface-3);
  border: 1px solid var(--line);
}

.badge-emoji {
  line-height: 1;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.1));
}

.badge-q {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-400);
  font-family: var(--font-display);
}

/* ── Badge text ───────────────────────────────────────────────── */
.badge-body { min-width: 0; width: 100%; }

.badge-name {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-800);
  line-height: 1.3;
  margin-bottom: 3px;
}

.is-locked .badge-name {
  color: var(--ink-400);
}

.badge-date {
  font-size: 10px;
  color: var(--teal-700);
  font-weight: 500;
}

.badge-hint {
  font-size: 10px;
  color: var(--ink-400);
}

/* ── Tooltip ──────────────────────────────────────────────────── */
.badge-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink-900);
  color: #fff;
  font-size: 11px;
  line-height: 1.45;
  padding: 7px 10px;
  border-radius: 7px;
  white-space: normal;
  width: 160px;
  text-align: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform: translateX(-50%) translateY(4px);
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.badge-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--ink-900);
}

.ach-badge:hover .badge-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip-how {
  display: block;
  font-weight: 700;
  margin-bottom: 2px;
  color: var(--teal-300);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Pop animation ────────────────────────────────────────────── */
@keyframes badge-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  70%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}
</style>
