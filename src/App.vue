<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useBurnState } from './composables/useBurnState'
import { useBurnComputeds } from './composables/useBurnComputeds'
import { useClock } from './composables/useClock'
import { useAutoRollover } from './composables/useAutoRollover'
import { useReducedMotion } from './composables/useReducedMotion'
import { useVisibilityClass } from './composables/useVisibilityClass'
import BurnHeader from './components/BurnHeader.vue'
import PreWeekBanner from './components/PreWeekBanner.vue'
import PaceBar from './components/PaceBar.vue'
import InsightCard from './components/InsightCard.vue'
import MetricsRow from './components/MetricsRow.vue'
import BurnControls from './components/BurnControls.vue'
import CommandPalette from './components/CommandPalette.vue'
import UpdateToast from './components/UpdateToast.vue'
import type { Mode } from './types/burn'

const burn = useBurnState()
const reduced = useReducedMotion()
useVisibilityClass()

const dummyRemaining = ref(Number.POSITIVE_INFINITY)
const now = useClock(() => dummyRemaining.value)
const c = useBurnComputeds(now)

watch(c.timeRemainingMs, (v) => { dummyRemaining.value = v }, { immediate: true })

// Toasts (rollover, share-copied)
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
    pushToast(`Du warst weg — ${shiftedBy} Wochen übersprungen, neue Quota läuft.`, 'celebrate')
  } else {
    pushToast('Frische Woche — Quota auf 0 zurückgesetzt', 'celebrate')
  }
})

// === Score-Pop particles — game-style "+N%" floaters on percent changes ===
interface Pop { id: number; delta: number; kind: 'usage' | 'time'; x: number; y: number; bornAt: number }
const pops = ref<Pop[]>([])
let popCounter = 0
const POP_AGGREGATE_MS = 220   // merge same-kind same-sign pops if last spawn was this recent
const POP_LIFE_MS = 1400

function spawnPop(delta: number, kind: 'usage' | 'time'): void {
  if (reduced.value || delta === 0) return
  const now = Date.now()
  // Aggregation: if the latest still-young pop matches in kind + sign, merge instead of spawning.
  const last = pops.value.at(-1)
  if (
    last &&
    last.kind === kind &&
    Math.sign(last.delta) === Math.sign(delta) &&
    now - last.bornAt < POP_AGGREGATE_MS
  ) {
    pops.value = pops.value.map((p) =>
      p.id === last.id ? { ...p, delta: p.delta + delta, bornAt: now } : p,
    )
    return
  }
  popCounter += 1
  const id = popCounter
  const jitterX = (Math.random() - 0.5) * 36
  const jitterY = (Math.random() - 0.5) * 8
  pops.value = [...pops.value, { id, delta, kind, x: jitterX, y: jitterY, bornAt: now }]
  window.setTimeout(() => {
    pops.value = pops.value.filter((p) => p.id !== id)
  }, POP_LIFE_MS)
}

// Initial values to suppress spawn on first watcher fire
const initialUsage = burn.usagePercent.value
const initialTime = c.timePercent.value

watch(() => burn.usagePercent.value, (curr, prev) => {
  if (prev === undefined || curr === prev || curr === initialUsage && prev === initialUsage) return
  spawnPop(curr - prev, 'usage')
})

watch(() => c.timePercent.value, (curr, prev) => {
  if (prev === undefined || curr === prev || curr === initialTime && prev === initialTime) return
  // Time only ticks +1 per ~14min, so this is a slow heartbeat-style spawn
  spawnPop(curr - prev, 'time')
})

// Confetti + haptic on mode → burn transitions
watch(() => c.status.value.mode, async (mode: Mode, old: Mode | undefined) => {
  if (mode === old) return
  if (!reduced.value && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(10)
  }
  if (mode === 'burn' && old !== 'burn' && old !== undefined && !reduced.value) {
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
    } catch { /* best-effort */ }
  }
})

// Command Palette
const paletteOpen = ref(false)
function openPalette(): void { paletteOpen.value = true }
function closePalette(): void { paletteOpen.value = false }

async function shareBurnRate(): Promise<void> {
  const text = `🔋 ${burn.usagePercent.value}% used · ${c.timePercent.value}% time · ${c.delta.value >= 0 ? '+' : ''}${c.delta.value}% headroom · Reset in ${c.countdown.value.days}d ${c.countdown.value.hours}h`
  if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Claude Burn Rate', text })
      return
    } catch { /* fall through to clipboard */ }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    pushToast('In Zwischenablage kopiert')
  }
}

// App badge — debounced so a slider drag doesn't fire 30+ async calls/second
type BadgeNav = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}
const writeBadge = useDebounceFn((v: number) => {
  const nav = navigator as BadgeNav
  if (typeof nav.setAppBadge !== 'function') return
  if (v <= 0) {
    nav.clearAppBadge?.().catch(() => {})
  } else {
    nav.setAppBadge(v).catch(() => {})
  }
}, 500)

watch(() => burn.usagePercent.value, (v) => {
  void writeBadge(v)
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
      :week-start="c.weekStart.value"
      :ms-per-percent="c.msPerPercent.value"
    />

    <InsightCard
      :sentence="c.tomorrowSentence.value"
      :projected-end="c.forecast.value.projectedEndUsage"
      :reliable="c.forecastReliable.value"
      :time-percent="c.timePercent.value"
      :usage-percent="burn.usagePercent.value"
      :ghost-usage="c.ghostUsage.value"
      :delta="c.delta.value"
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

    <CommandPalette
      :open="paletteOpen"
      @close="closePalette"
      @share="shareBurnRate"
      @snap="() => { burn.snapResetToSevenDays(); pushToast('Reset auf 7 Tage gesetzt') }"
      @sync="() => { burn.usagePercent.value = c.timePercent.value; pushToast('Usage = Zeit') }"
      @new-week="() => { burn.resetWeek(); pushToast('Neue Woche — Usage zurückgesetzt') }"
    />

    <UpdateToast />

    <!-- Score-Pop overlay: arcade-style percent floaters -->
    <div class="pop-layer" aria-hidden="true">
      <TransitionGroup name="pop">
        <span
          v-for="p in pops"
          :key="p.id"
          class="pop"
          :class="[p.delta > 0 ? 'pop-up' : 'pop-down', `pop-${p.kind}`]"
          :style="{
            transform: `translate(${p.x}px, ${p.y}px)`,
          }"
        >
          {{ p.delta > 0 ? '+' : '−' }}{{ Math.abs(p.delta) }}%
        </span>
      </TransitionGroup>
    </div>

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

    <!-- SEO crawlable content (visible to readers + search engines) -->
    <section class="about">
      <h2>Über die App</h2>
      <p>
        <strong>Claude Burn Rate</strong> ist ein kostenloser, lokaler Pace-Tracker für deine
        wöchentliche <a href="https://www.anthropic.com/" rel="noopener noreferrer">Anthropic Claude</a>-Quota.
        Du gibst dein Reset-Datum + deinen aktuellen Usage-Stand ein — die App zeigt dir live, wie viel Quota
        du übrig hast, wie dein Daily Budget aussieht und ob du im aktuellen Tempo bis zum Wochenende durchhältst.
      </p>
      <p>
        Funktioniert <em>komplett lokal</em>: kein Account, kein Server, keine Tracker. Alle Werte
        leben in deinem <code>localStorage</code>. Installierbar als PWA — auf Mobile direkt im Homescreen.
      </p>
      <ul class="about-keywords">
        <li>Claude Code Usage Tracker</li>
        <li>Claude Pro Weekly Limit</li>
        <li>Anthropic Quota Calculator</li>
        <li>Rolling 7-Day Burn Rate</li>
        <li>Open Source · MIT · Vue 3 PWA</li>
      </ul>
      <p class="meta-row">
        <a href="https://github.com/shroomlife/claude-week-burn" rel="noopener noreferrer">GitHub Repo</a>
        · build by you · for you · shroomlife flavor
      </p>
    </section>
  </main>
</template>

<style scoped>
main {
  min-height: 100vh;
  max-width: 940px;
  margin: 0 auto;
  padding: 24px 18px calc(28px + env(safe-area-inset-bottom));
  display: grid;
  gap: 14px;
  align-content: start;
  position: relative;
}

.about {
  margin-top: 28px;
  padding: 22px 6px 6px;
  font-size: 13px;
  color: var(--c-mute);
  line-height: 1.6;
  letter-spacing: -0.005em;
  border-top: 1px solid var(--c-hair);
}
.about h2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
  margin: 0 0 8px;
  letter-spacing: -0.005em;
}
.about p { margin: 0 0 8px; }
.about a {
  color: var(--c-ink);
  text-decoration: underline;
  text-decoration-color: var(--c-line);
  text-underline-offset: 3px;
}
.about a:hover { text-decoration-color: var(--c-flame-2); color: var(--c-flame-2); }
.about code {
  font-family: var(--font-mono);
  background: rgba(15, 23, 42, 0.04);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11.5px;
}
.about-keywords {
  list-style: none;
  padding: 0;
  margin: 8px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.about-keywords li {
  font-size: 11.5px;
  padding: 3px 9px;
  background: rgba(15, 23, 42, 0.04);
  border-radius: var(--r-pill);
  color: var(--c-ink-soft);
  font-weight: 500;
}
.meta-row { font-size: 12px; opacity: 0.85; }

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
  padding: 11px 17px;
  border-radius: var(--r-pill);
  font-size: 13px;
  font-weight: 500;
  background: var(--c-ink);
  color: white;
  box-shadow: 0 14px 32px -14px rgba(15, 23, 42, 0.45);
  animation: toast-in 320ms var(--ease-spring);
  pointer-events: auto;
  letter-spacing: -0.005em;
}
.toast-celebrate {
  background: linear-gradient(135deg, #fb923c, #ea580c);
}
@keyframes toast-in {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* === Score-Pop "+N%" floaters — game-style === */
.pop-layer {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 30;
}
.pop {
  position: absolute;
  top: 32%;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.04em;
  line-height: 1;
  text-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
  pointer-events: none;
  will-change: transform, opacity;
}
.pop-up   { color: var(--c-flame-2); }
.pop-down { color: var(--c-pace-ahead); }
.pop-time { font-size: 18px; opacity: 0.7; }

.pop-enter-active {
  animation: pop-fly 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.pop-leave-active {
  transition: opacity 0.2s ease;
}
.pop-leave-to { opacity: 0; }

@keyframes pop-fly {
  0% {
    transform: translate(var(--start-x, 0), 30px) scale(0.4) rotate(-6deg);
    opacity: 0;
  }
  15% {
    transform: translate(var(--start-x, 0), 10px) scale(1.2) rotate(2deg);
    opacity: 1;
  }
  30% {
    transform: translate(var(--start-x, 0), -10px) scale(1) rotate(-2deg);
    opacity: 1;
  }
  100% {
    transform: translate(var(--start-x, 0), -110px) scale(0.9) rotate(4deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pop-enter-active { animation: none; opacity: 0; }
}

@media (max-width: 560px) {
  main {
    padding: 14px 12px calc(20px + env(safe-area-inset-bottom));
    gap: 12px;
  }
  .pop { font-size: 22px; }
}
</style>
