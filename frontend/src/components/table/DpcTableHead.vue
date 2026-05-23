<script setup>
/**
 * DpcTableHead - Sticky table header with optional sorting
 * Premium typography: 10px uppercase, tight tracking, bold
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  sticky: { type: Boolean, default: true },
})

const isScrolled = ref(false)
const headerRef = ref(null)

// Detect scroll to add shadow
function handleScroll() {
  if (!props.sticky || !headerRef.value) return
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  isScrolled.value = scrollTop > 100
}

onMounted(() => {
  if (props.sticky) {
    window.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div
    ref="headerRef"
    :class="[
      'dpc-table-head',
      sticky && 'is-sticky',
      isScrolled && 'is-scrolled',
    ]"
    role="rowgroup"
  >
    <slot />
  </div>
</template>

<style scoped>
.dpc-table-head {
  display: contents;
}
</style>
