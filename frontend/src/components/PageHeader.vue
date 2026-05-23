<script setup>
import DpcIcon from './DpcIcon.vue'

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  gradient: { type: Boolean, default: false }, // Apply gradient to title
  variant: { type: String, default: 'default', validator: v => ['default', 'hero'].includes(v) }
})

// Slots: actions, below
</script>

<template>
  <div :class="['page-header', `page-header--${variant}`]">
    <div class="header-content">
      <!-- Eyebrow -->
      <div v-if="eyebrow" class="header-eyebrow">
        <DpcIcon v-if="icon" :name="icon" :size="11" :stroke-width="2" />
        {{ eyebrow }}
      </div>

      <!-- Title -->
      <h1 :class="['dpc-h', 'header-title', gradient && 'has-gradient']">
        <template v-if="gradient">
          <template v-for="(word, i) in title.split(' ')" :key="i">
            <template v-if="i === title.split(' ').length - 1">
              <span class="text-teal">{{ word }}</span>
            </template>
            <template v-else>
              <span>{{ word }}</span>{{ ' ' }}
            </template>
          </template>
        </template>
        <template v-else>{{ title }}</template>
      </h1>

      <!-- Subtitle -->
      <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>

      <!-- Below slot (for filters, tabs, etc.) -->
      <div v-if="$slots.below" class="header-below">
        <slot name="below" />
      </div>
    </div>

    <!-- Actions slot (for buttons, search, etc.) -->
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}

.page-header--hero {
  background: linear-gradient(135deg, var(--paper) 0%, var(--surface) 100%);
  padding: 32px 28px;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.header-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--teal-50);
  color: var(--teal-700);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: inset 0 0 0 1px var(--teal-100);
  margin-bottom: 12px;
}

.header-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--ink-900);
  margin-bottom: 6px;
  letter-spacing: -0.02em;
  line-height: 1.2;
  white-space: pre-wrap;
}

.page-header--hero .header-title {
  font-size: 32px;
}

.header-title.has-gradient {
  /* Already handled inline with text-teal */
}

.header-subtitle {
  font-size: 14.5px;
  color: var(--ink-500);
  line-height: 1.5;
  max-width: 600px;
  margin: 0;
}

.header-below {
  margin-top: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: stretch;
  }

  .header-actions > * {
    flex: 1;
  }
}
</style>
