<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBurnState } from './composables/useBurnState'
import { useBurnComputeds } from './composables/useBurnComputeds'
import { useClock } from './composables/useClock'
import { useAutoRollover } from './composables/useAutoRollover'
import { useReducedMotion } from './composables/useReducedMotion'
import BurnHeader from './components/BurnHeader.vue'
import PreWeekBanner from './components/PreWeekBanner.vue'
import PaceBar from './components/PaceBar.vue'
import ForecastCard from './components/ForecastCard.vue'
import GaugeHero from './components/GaugeHero.vue'
import MetricsRow from './components/MetricsRow.vue'
import BurnControls from './components/BurnControls.vue'
import CommandPalette from './components/CommandPalette.vue'
import UpdateToast from './components/UpdateToast.vue'
import type { Mode } from './types/burn'

const burn = useBurnState()
const reduced = useReducedMotion()

// Adaptive clock: fast (1s) in the last hour, slow (60s) otherwise. Visibility-aware.
const dummyRemaining = ref(Number.POSITIVE_INFINITY)
const now = useClock(() => dummyRemaining.value)
const c = useBurnComputeds(now)

// Feed real remaining-ms back into the clock to drive adaptive cadence.
watch(c.timeRemainingMs, (v) => { dummyRemaining.value = v }, { immediate: true })

// Toast state — used by rollover and SW refresh.
interface Toast { id: number; text: string; tone: 'info' | 'celebrate' }
const toasts = ref<Toast[]>([])
let toastCounter = 0
function pushToast(text: string, tone: Toast['tone'] = 'info'): void {
  toastCounter += 1
  const id = toastCounter
  toasts.value = [...toasts.value, { id, text, tone }]
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4200)
}

useAutoRollover(now, ({ shiftedBy, hadGap }) => {
  if (hadGap && shiftedBy > 1) {
    pushToast(`Du warst weg — ${shiftedBy} Wochen übersprungen, neue Quota läuft. 🎉`, 'celebrate')
  } else {
    pushToast('Frische Woche — Quota auf 0 zurückgesetzt 🚀', 'celebrate')
  }
})

// Haptic + confetti on mode → burn transitions only.
const prevMode = ref<Mode>(c.status.value.mode)
watch(() => c.status.value.mode, async (mode, old) => {
  if (mode === old) return
  prevMode.value = mode

  if (!reduced.value && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(10)
  }

  if (mode === 'burn' && old !== 'burn' && !reduced.value) {
    try {
      const { default: confetti } = await import('canvas-confetti')
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 35,
        origin: { y: 0.35 },
        colors: ['#fb923c', '#ea580c', '#f43f5e', '#d946ef', '#22d3ee'],
        disableForReducedMotion: true,
      })
    } catch {
      // confetti is best-effort
    }
  }
})

// Command Palette open state — bound to ⌘K / Ctrl+K + the question-mark shortcut.
const paletteOpen = ref(false)
function openPalette(): void { paletteOpen.value = true }
function closePalette(): void { paletteOpen.value = false }

// Share burn rate via system Share Sheet, fallback to clipboard.
async function shareBurnRate(): Promise<void> {
  const text = `🔋 ${burn.usagePercent.value}% used · ${c.timePercent.value}% time · ${c.delta.value >= 0 ? '+' : ''}${c.delta.value}% headroom · Reset in ${c.countdown.value.days}d ${c.countdown.value.hours}h`
  if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Claude Burn Rate', text })
      return
    } catch {
      /* user cancelled or unsupported, fall through */
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    pushToast('In Zwischenablage kopiert 📋')
  }
}

// App-badge: usage % on home-screen icon when installed.
watch(() => burn.usagePercent.value, (v) => {
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  if (typeof nav.setAppBadge !== 'function') return
  if (v <= 0) {
    nav.clearAppBadge?.().catch(() => {})
  } else {
    nav.setAppBadge(v).catch(() => {})
  }
}, { immediate: true })

const modeClass = computed(() => `mode-${c.status.value.mode}`)
</script>

<template>
  <main :class="modeClass">
    <BurnHeader
      :countdown="c.countdown.value"
      @open-palette="openPalette"
    />

    <PreWeekBanner
      v-if="c.preWeek.value"
      :days="c.daysUntilWeekStart.value"
      :week-start-label="c.weekStartLabel.value"
      @snap="burn.snapResetToSevenDays"
    />

    <PaceBar
      :time-percent="c.timePercent.value"
      :usage-percent="burn.usagePercent.value"
      :delta="c.delta.value"
      :status="c.status.value"
    />

    <ForecastCard
      :sentence="c.tomorrowSentence.value"
      :projected-end="c.forecast.value.projectedEndUsage"
    />

    <GaugeHero
      :time-percent="c.timePercent.value"
      :usage-percent="burn.usagePercent.value"
      :ghost-usage="c.ghostUsage.value"
      :delta="c.delta.value"
      :status="c.status.value"
      :reduced="reduced"
    />

    <MetricsRow
      :countdown="c.countdown.value"
      :daily-budget="c.dailyBudget.value"
      :remaining-percent="c.remainingPercent.value"
    />

    <BurnControls
      v-model:usage-percent="burn.usagePercent.value"
      v-model:reset-date="burn.resetDate.value"
      :time-percent="c.timePercent.value"
      :timezone-label="c.timezoneLabel.value"
      :week-start-label="c.weekStartLabel.value"
    />

    <footer class="foot">
      build by you · for you · <strong>shroomlife flavor</strong> ✨
    </footer>

    <CommandPalette
      :open="paletteOpen"
      @close="closePalette"
      @share="shareBurnRate"
      @snap="() => { burn.snapResetToSevenDays(); pushToast('Reset auf 7 Tage gesetzt') }"
      @sync="() => { burn.usagePercent.value = c.timePercent.value; pushToast('Usage = Zeit') }"
      @new-week="() => { burn.resetWeek(); pushToast('Neue Woche — Usage zurückgesetzt') }"
    />

    <UpdateToast />

    <div class="toast-tray" aria-live="polite">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast-${t.tone}`"
      >
        {{ t.text }}
      </div>
    </div>
  </main>
</template>

<style scoped>
main {
  min-height: 100vh;
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px 18px calc(28px + env(safe-area-inset-bottom));
  display: grid;
  gap: 18px;
  align-content: start;
  position: relative;
}

.foot {
  text-align: center;
  font-size: 12px;
  color: var(--c-line);
  padding: 6px 0 4px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.foot strong { color: var(--c-mute); font-weight: 700; }

.toast-tray {
  position: fixed;
  left: 50%;
  bottom: calc(20px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 50;
  pointer-events: none;
}
.toast {
  padding: 12px 18px;
  border-radius: var(--r-pill);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  background: rgba(15, 23, 42, 0.92);
  color: white;
  box-shadow: 0 16px 40px -16px rgba(15, 23, 42, 0.5);
  animation: toast-in 320ms var(--ease-spring);
  pointer-events: auto;
}
.toast-celebrate {
  background: linear-gradient(135deg, #fb923c, #ea580c);
}

@keyframes toast-in {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@media (max-width: 560px) {
  main {
    padding: 14px 12px calc(20px + env(safe-area-inset-bottom));
    gap: 14px;
  }
}
</style>
