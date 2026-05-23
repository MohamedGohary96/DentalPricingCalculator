<script setup>
import { computed } from 'vue'
import DpcIcon from './DpcIcon.vue'

const props = defineProps({
  variant: { type: String, default: 'info', validator: v => ['info', 'success', 'warning', 'danger'].includes(v) },
  title: { type: String, default: '' },
  message: { type: String, required: true },
  icon: { type: String, default: '' },
  dismissible: { type: Boolean, default: false },
  actionLabel: { type: String, default: '' }
})

const emit = defineEmits(['dismiss', 'action'])

// Slots are automatically available via $slots in template

const variantConfig = computed(() => {
  const configs = {
    info: {
      icon: 'Info',
      bg: 'rgba(14,165,233,.08)',
      border: 'rgba(14,165,233,.15)',
      color: '#0284c7',
      iconBg: 'rgba(14,165,233,.12)'
    },
    success: {
      icon: 'CheckCircle',
      bg: 'var(--success-50)',
      border: 'var(--success-100)',
      color: 'var(--success-700)',
      iconBg: 'var(--success-100)'
    },
    warning: {
      icon: 'AlertTriangle',
      bg: 'var(--warning-50)',
      border: 'var(--warning-100)',
      color: 'var(--warning-700)',
      iconBg: 'var(--warning-100)'
    },
    danger: {
      icon: 'AlertCircle',
      bg: 'var(--danger-50)',
      border: 'var(--danger-100)',
      color: 'var(--danger-700)',
      iconBg: 'var(--danger-100)'
    }
  }
  return configs[props.variant]
})

const displayIcon = computed(() => props.icon || variantConfig.value.icon)
</script>

<template>
  <div
    class="alert-banner"
    :style="{
      background: variantConfig.bg,
      borderColor: variantConfig.border,
      color: variantConfig.color
    }"
  >
    <!-- Icon -->
    <div class="alert-icon" :style="{ background: variantConfig.iconBg }">
      <DpcIcon :name="displayIcon" :size="16" :stroke-width="1.8" />
    </div>

    <!-- Content -->
    <div class="alert-content">
      <div v-if="title" class="alert-title">{{ title }}</div>
      <div class="alert-message">
        <slot>{{ message }}</slot>
      </div>
    </div>

    <!-- Action button -->
    <button
      v-if="actionLabel"
      class="alert-action"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>

    <!-- Dismiss button -->
    <button
      v-if="dismissible"
      class="alert-dismiss"
      aria-label="Dismiss"
      @click="$emit('dismiss')"
    >
      <DpcIcon name="X" :size="14" :stroke-width="2" />
    </button>
  </div>
</template>

<style scoped>
.alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid;
  animation: slide-in-down 0.3s var(--ease-spring);
}

@keyframes slide-in-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  flex: none;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.alert-message {
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.9;
}

.alert-action {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.08);
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast);
  flex: none;
  white-space: nowrap;
}

.alert-action:hover {
  background: rgba(0, 0, 0, 0.12);
}

.alert-dismiss {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  transition: all var(--duration-fast);
  flex: none;
}

.alert-dismiss:hover {
  background: rgba(0, 0, 0, 0.08);
  opacity: 1;
}
</style>
