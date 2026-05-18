import { onMounted, onUnmounted } from 'vue'

/**
 * Toggles `body.is-hidden` when document.hidden flips, so CSS can pause
 * heavy animations via `animation-play-state: paused`. Keeps RAM/CPU low
 * when the tab is in the background.
 */
export function useVisibilityClass(): void {
  const sync = (): void => {
    document.body.classList.toggle('is-hidden', document.hidden)
  }

  onMounted(() => {
    sync()
    document.addEventListener('visibilitychange', sync)
  })
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', sync)
  })
}
