import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

export function useRestriction() {
  const auth  = useAuthStore()
  const level = computed(() => auth.subscription?.restriction_level || 'active')

  const isTrial   = computed(() => level.value === 'trial')
  const isLockout = computed(() => level.value === 'lockout' || level.value === 'readonly')
  const isActive  = computed(() => !isTrial.value && !isLockout.value)

  return { level, isTrial, isLockout, isActive }
}
