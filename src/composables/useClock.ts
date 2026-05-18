import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * Visibility-aware clock. Adaptive: fast tick when timeRemaining drops below `fastThresholdMs`,
 * slow tick otherwise. Pauses when tab is hidden, resyncs on visibilitychange.
 *
 * @param getTimeRemainingMs read-only function returning ms until reset
 */
export function useClock(
  getTimeRemainingMs: () => number,
  fastMs = 1000,
  slowMs = 60_000,
  fastThresholdMs = 60 * 60 * 1000,
): Ref<number> {
  const now = ref(Date.now())
  let id: ReturnType<typeof setInterval> | null = null
  let currentInterval = slowMs

  const desiredInterval = (): number =>
    getTimeRemainingMs() < fastThresholdMs ? fastMs : slowMs

  const start = (): void => {
    if (id !== null) return
    currentInterval = desiredInterval()
    id = setInterval(() => {
      now.value = Date.now()
      const next = desiredInterval()
      if (next !== currentInterval) {
        stop()
        start()
      }
    }, currentInterval)
  }

  const stop = (): void => {
    if (id !== null) {
      clearInterval(id)
      id = null
    }
  }

  const onVisibility = (): void => {
    if (document.hidden) {
      stop()
    } else {
      now.value = Date.now()
      start()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    start()
  })
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    stop()
  })

  return now
}
