<script setup>
import { onMounted, ref } from 'vue'
import { RouterView }      from 'vue-router'
import ToastContainer      from '@/components/ToastContainer.vue'
import { useAuthStore }    from '@/stores/auth.js'

const auth = useAuthStore()

// Track if initial auth check is complete
const isReady = ref(false)

onMounted(() => {
  const checkReady = () => {
    if (!auth.loading) {
      isReady.value = true
    } else {
      requestAnimationFrame(checkReady)
    }
  }
  checkReady()
})
</script>

<template>
  <!-- Loading screen until auth data is ready -->
  <div v-if="!isReady" class="app-loading">
    <div class="loading-spinner">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
        </path>
      </svg>
    </div>
  </div>

  <!-- App content once ready -->
  <template v-else>
    <RouterView />
    <ToastContainer />
  </template>
</template>

<style scoped>
.app-loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  z-index: 9999;
}

.loading-spinner {
  color: var(--teal-600);
}
</style>
