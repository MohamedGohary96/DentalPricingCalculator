<script setup>
import DpcIcon from './DpcIcon.vue'

defineProps({
  variant: { type: String, default: 'feature', validator: v => ['testimonial', 'stat', 'feature'].includes(v) },
  icon: { type: String, default: 'Sparkles' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, default: '' },
  delay: { type: Number, default: 0 }
})
</script>

<template>
  <div :class="['auth-hero-card', `auth-hero-card--${variant}`]" :style="{ '--card-delay': `${delay}ms` }">
    <div v-if="variant !== 'testimonial'" class="card-icon">
      <DpcIcon :name="icon" :size="variant === 'stat' ? 16 : 14" :stroke-width="1.8" />
    </div>

    <div class="card-content">
      <div class="card-title">{{ title }}</div>
      <div class="card-text">{{ content }}</div>
      <div v-if="variant === 'testimonial' && author" class="card-author">
        <div class="author-avatar">{{ author.charAt(0) }}</div>
        <span>{{ author }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-hero-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: card-float-in 0.6s var(--ease-spring) forwards;
  animation-delay: var(--card-delay);
  opacity: 0;
}

@keyframes card-float-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-hero-card--testimonial {
  max-width: 340px;
}

.auth-hero-card--stat {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}

.auth-hero-card--feature {
  display: flex;
  gap: 14px;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.25);
  display: grid;
  place-items: center;
  color: var(--teal-300);
  flex: none;
}

.auth-hero-card--stat .card-icon {
  width: 48px;
  height: 48px;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}

.auth-hero-card--stat .card-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}

.card-text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

.auth-hero-card--stat .card-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.auth-hero-card--testimonial .card-text {
  font-style: italic;
  margin-bottom: 12px;
}

.card-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--teal-500), var(--teal-700));
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 600;
}

/* Hover effect for interactive feel */
.auth-hero-card {
  transition: transform 0.3s var(--ease-spring), box-shadow 0.3s;
}

.auth-hero-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
}
</style>
