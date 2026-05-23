<script setup>
/**
 * DpcSkeleton — loading placeholder
 *
 * Usage:
 *   <DpcSkeleton variant="table" />
 *   <DpcSkeleton variant="form" />
 *   <DpcSkeleton variant="cards" />
 *   <DpcSkeleton variant="dashboard" />
 *
 * Shimmer animation: background-position sweep defined in animations.css.
 * When the real content is ready, wrap it in a div.content-reveal (also
 * defined in animations.css) so it fades in at 200ms ease.
 */
defineProps({
  variant: {
    type:      String,
    default:   'table',
    validator: v => ['table', 'form', 'cards', 'dashboard'].includes(v),
  },
})
</script>

<template>
  <div class="skeleton" :class="`skeleton--${variant}`" aria-hidden="true" aria-busy="true">

    <!-- ── TABLE: 5 rows × 4 columns ──────────────────────────── -->
    <template v-if="variant === 'table'">
      <!-- Header row -->
      <div class="sk-row sk-row--header">
        <div v-for="c in 4" :key="c" class="sk-cell sk-cell--header shimmer" />
      </div>
      <!-- Body rows -->
      <div v-for="r in 5" :key="r" class="sk-row">
        <div
          v-for="c in 4"
          :key="c"
          class="sk-cell shimmer"
          :style="{ width: c === 1 ? '40%' : c === 4 ? '15%' : '25%' }"
        />
      </div>
    </template>

    <!-- ── FORM: 3 label+input groups + button ─────────────────── -->
    <template v-else-if="variant === 'form'">
      <div v-for="i in 3" :key="i" class="sk-field-group">
        <div class="sk-label shimmer" />
        <div class="sk-input shimmer" />
      </div>
      <div class="sk-btn shimmer" />
    </template>

    <!-- ── CARDS: 2×2 grid ─────────────────────────────────────── -->
    <template v-else-if="variant === 'cards'">
      <div class="sk-cards-grid">
        <div v-for="i in 4" :key="i" class="sk-card">
          <div class="sk-card__thumb shimmer" />
          <div class="sk-card__body">
            <div class="sk-card__title shimmer" />
            <div class="sk-card__subtitle shimmer" />
            <div class="sk-card__subtitle sk-card__subtitle--short shimmer" />
          </div>
        </div>
      </div>
    </template>

    <!-- ── DASHBOARD: 4 KPI blocks + wide chart ────────────────── -->
    <template v-else-if="variant === 'dashboard'">
      <!-- KPI row -->
      <div class="sk-kpi-row">
        <div v-for="i in 4" :key="i" class="sk-kpi">
          <div class="sk-kpi__eyebrow shimmer" />
          <div class="sk-kpi__value   shimmer" />
          <div class="sk-kpi__delta   shimmer" />
        </div>
      </div>
      <!-- Wide chart placeholder -->
      <div class="sk-chart shimmer" />
    </template>

  </div>
</template>

<style scoped>
/* ── Shared shimmer bar styles ──────────────────────────────────── */
/* The .shimmer utility class (background gradient + animation) is
   defined globally in animations.css. Local rules handle sizing.   */

.skeleton {
  width: 100%;
}

/* ────────────────────────────────────────────────────────────────
   TABLE variant
   ──────────────────────────────────────────────────────────────── */

.skeleton--table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: var(--radius-md, 14px);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--line, #e7e5e0);
}

.sk-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line, #e7e5e0);
}
.sk-row:last-child { border-bottom: 0; }

.sk-row--header {
  background: var(--paper-2, #f5f4ee);
  padding: 10px 16px;
}

.sk-cell {
  height: 14px;
  border-radius: var(--radius-sm, 6px);
  flex: 1;
}
.sk-cell--header { height: 11px; opacity: 0.7; }

/* ────────────────────────────────────────────────────────────────
   FORM variant
   ──────────────────────────────────────────────────────────────── */

.skeleton--form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sk-field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-label {
  height: 12px;
  width: 120px;
  border-radius: var(--radius-sm, 6px);
}

.sk-input {
  height: 44px;
  border-radius: var(--radius-base, 10px);
}

.sk-btn {
  height: 44px;
  width: 140px;
  border-radius: var(--radius-base, 10px);
  margin-top: 4px;
}

/* ────────────────────────────────────────────────────────────────
   CARDS variant
   ──────────────────────────────────────────────────────────────── */

.sk-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.sk-card {
  background: var(--surface, #fff);
  border-radius: var(--radius-md, 14px);
  box-shadow: inset 0 0 0 1px var(--line, #e7e5e0);
  overflow: hidden;
}

.sk-card__thumb {
  height: 140px;
  border-radius: 0;
}

.sk-card__body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-card__title {
  height: 16px;
  width: 70%;
  border-radius: var(--radius-sm, 6px);
}

.sk-card__subtitle {
  height: 12px;
  width: 90%;
  border-radius: var(--radius-sm, 6px);
}
.sk-card__subtitle--short { width: 55%; }

/* ────────────────────────────────────────────────────────────────
   DASHBOARD variant
   ──────────────────────────────────────────────────────────────── */

.skeleton--dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sk-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.sk-kpi {
  background: var(--surface, #fff);
  border-radius: var(--radius-md, 14px);
  box-shadow: inset 0 0 0 1px var(--line, #e7e5e0);
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk-kpi__eyebrow {
  height: 10px;
  width: 55%;
  border-radius: var(--radius-sm, 6px);
}

.sk-kpi__value {
  height: 28px;
  width: 70%;
  border-radius: var(--radius-sm, 6px);
}

.sk-kpi__delta {
  height: 11px;
  width: 40%;
  border-radius: var(--radius-sm, 6px);
}

.sk-chart {
  height: 220px;
  border-radius: var(--radius-md, 14px);
  box-shadow: inset 0 0 0 1px var(--line, #e7e5e0);
}

/* ── Responsive: stack cards + KPI on mobile ──────────────────── */
@media (max-width: 640px) {
  .sk-kpi-row       { grid-template-columns: repeat(2, 1fr); }
  .sk-cards-grid    { grid-template-columns: 1fr; }
}
</style>
