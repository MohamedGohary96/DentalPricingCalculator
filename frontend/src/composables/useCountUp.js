/**
 * useCountUp — animates a number from 0 to a target value
 * using requestAnimationFrame with cubic-ease-out.
 *
 * Usage:
 *   const { displayValue, start } = useCountUp(targetRef, 1200)
 *   onMounted(start)
 */
import { ref, watch } from 'vue'

export function useCountUp(targetRef, duration = 1200) {
  const displayValue = ref(0)
  let rafId = null
  let startTime = null

  // cubic ease-out: starts fast, decelerates to a stop
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3)
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeOut(progress)
    const target = typeof targetRef === 'object' && 'value' in targetRef
      ? targetRef.value
      : targetRef
    displayValue.value = Math.round(eased * target)
    if (progress < 1) {
      rafId = requestAnimationFrame(animate)
    } else {
      displayValue.value = target
    }
  }

  function start() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    startTime = null
    displayValue.value = 0
    rafId = requestAnimationFrame(animate)
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return { displayValue, start, stop }
}
