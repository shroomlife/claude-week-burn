<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTransition, TransitionPresets } from '@vueuse/core'
import type { Status } from '../types/burn'

const props = defineProps<{
  timePercent: number
  usagePercent: number
  ghostUsage: number
  delta: number
  status: Status
  reduced: boolean
}>()

const TIME_R = 170
const USAGE_R = 130
const GHOST_R = 150
const TIME_CIRC = 2 * Math.PI * TIME_R
const USAGE_CIRC = 2 * Math.PI * USAGE_R
const GHOST_CIRC = 2 * Math.PI * GHOST_R

const timeOffset = computed(() => TIME_CIRC * (1 - Math.min(100, props.timePercent) / 100))
const usageOffset = computed(() => USAGE_CIRC * (1 - Math.min(100, props.usagePercent) / 100))
const ghostOffset = computed(() => GHOST_CIRC * (1 - Math.min(100, props.ghostUsage) / 100))
const ghostVisible = computed(() => props.ghostUsage > props.usagePercent + 2)
const ghostOver = computed(() => props.ghostUsage > 100)

// Number-roll on delta (whole-number target, but smoothed for 280ms).
const deltaSource = computed(() => props.delta)
const deltaSmoothed = useTransition(deltaSource, {
  duration: 280,
  transition: TransitionPresets.easeOutCubic,
  disabled: computed(() => props.reduced),
})
const deltaDisplay = computed(() => Math.round(deltaSmoothed.value))
const deltaSign = computed(() => (props.delta >= 0 ? '+' : '−'))

// Mode-enter event choreography: trigger a class for one shot, then clear.
const enterClass = ref<'' | 'enter-burn' | 'enter-cruise' | 'enter-careful' | 'enter-save'>('')
watch(() => props.status.mode, (mode, old) => {
  if (mode === old) return
  enterClass.value = `enter-${mode}` as typeof enterClass.value
  window.setTimeout(() => { enterClass.value = '' }, 620)
})

// Burn sparkles: cap to 3, only when burn mode is fresh (≤6s), then fade.
const sparklesOn = ref(false)
let sparkleTimer: number | null = null
watch(() => props.status.mode, (mode) => {
  if (sparkleTimer !== null) { window.clearTimeout(sparkleTimer); sparkleTimer = null }
  if (mode === 'burn' && !props.reduced) {
    sparklesOn.value = true
    sparkleTimer = window.setTimeout(() => { sparklesOn.value = false }, 6000)
  } else {
    sparklesOn.value = false
  }
})

function sparkleStyle(i: number): Record<string, string> {
  const left  = 14 + ((i * 23) % 70)
  const top   = 30 + ((i * 17) % 40)
  const delay = (i * 0.35) % 1.6
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
  }
}
</script>

<template>
  <section
    class="gauge-hero glass-hero"
    :class="[enterClass, props.reduced ? 'is-reduced' : '']"
  >
    <div class="gauge-wrap">
      <svg class="gauge" viewBox="-10 -10 420 420" aria-hidden="true">
        <defs>
          <linearGradient id="timeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22d3ee" />
            <stop offset="100%" stop-color="#0891b2" />
          </linearGradient>
          <linearGradient id="usageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb923c" />
            <stop offset="50%" stop-color="#f97316" />
            <stop offset="100%" stop-color="#ea580c" />
          </linearGradient>
          <linearGradient id="ghostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb923c" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.65" />
          </linearGradient>
          <filter id="ringShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feOffset dy="4" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.45  0 0 0 0 0.10  0 0 0 0.35 0" />
            <feBlend in="SourceGraphic" />
          </filter>
        </defs>

        <!-- Time outer ring -->
        <circle
          class="track time-track"
          cx="200" cy="200" r="170"
          transform="rotate(-90 200 200)"
        />
        <circle
          class="track time-fill"
          cx="200" cy="200" r="170"
          transform="rotate(-90 200 200)"
          :stroke-dasharray="TIME_CIRC"
          :stroke-dashoffset="timeOffset"
        />

        <!-- Ghost forecast ring (between usage and time) -->
        <circle
          v-if="ghostVisible"
          class="track ghost-fill"
          :class="{ 'ghost-over': ghostOver }"
          cx="200" cy="200" r="150"
          transform="rotate(-90 200 200)"
          :stroke-dasharray="`6 8`"
          :stroke-dashoffset="ghostOffset"
          :pathLength="GHOST_CIRC"
        />

        <!-- Usage inner ring -->
        <circle
          class="track usage-track"
          cx="200" cy="200" r="130"
          transform="rotate(-90 200 200)"
        />
        <circle
          class="track usage-fill"
          cx="200" cy="200" r="130"
          transform="rotate(-90 200 200)"
          :stroke-dasharray="USAGE_CIRC"
          :stroke-dashoffset="usageOffset"
        />
      </svg>

      <div class="gauge-center">
        <div class="status-emoji" aria-hidden="true">{{ status.emoji }}</div>
        <div class="delta-value">
          <span class="sign">{{ deltaSign }}</span>
          <span class="num">{{ Math.abs(deltaDisplay) }}</span>
          <span class="pct">%</span>
        </div>
        <div class="delta-label">Headroom Delta</div>
      </div>

      <template v-if="sparklesOn">
        <span
          v-for="i in 3"
          :key="i"
          class="sparkle"
          :style="sparkleStyle(i)"
        >
          {{ ['✨', '🚀', '💫'][i - 1] }}
        </span>
      </template>
    </div>

    <div class="legend">
      <div class="legend-item time">
        <span class="dot" aria-hidden="true"></span>
        <span class="label">Zeit verstrichen</span>
        <span class="value num">{{ timePercent }}%</span>
      </div>
      <div class="legend-item usage">
        <span class="dot" aria-hidden="true"></span>
        <span class="label">Usage verbraucht</span>
        <span class="value num">{{ usagePercent }}%</span>
      </div>
      <div v-if="ghostVisible" class="legend-item ghost">
        <span class="dot" aria-hidden="true"></span>
        <span class="label">Projektion</span>
        <span class="value num">{{ Math.min(200, ghostUsage) }}%</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gauge-hero {
  padding: 40px 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
}
.gauge-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, var(--c-mode-glow, transparent) 0%, transparent 55%);
  opacity: 0.4;
  pointer-events: none;
  transition: background 0.8s ease;
  z-index: 0;
}
.gauge-hero > * { position: relative; z-index: 1; }

.gauge-wrap {
  position: relative;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1;
}
.gauge {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.gauge .track {
  fill: none;
  stroke-linecap: round;
}
.gauge .time-track  { stroke: rgba(8, 145, 178, 0.12); stroke-width: 22; }
.gauge .time-fill   {
  stroke: url(#timeGrad);
  stroke-width: 22;
  filter: url(#ringShadow);
  transition: stroke-dashoffset 0.8s linear;
}
.gauge .usage-track { stroke: rgba(234, 88, 12, 0.12); stroke-width: 22; }
.gauge .usage-fill  {
  stroke: url(#usageGrad);
  stroke-width: 22;
  filter: url(#ringShadow);
  transition: stroke-dashoffset 320ms var(--ease-out-quint);
}

/* Suspend ring transition during slider drag (controlled by body class) */
:global(body.is-dragging) .gauge .usage-fill { transition: none !important; }

.gauge .ghost-fill {
  stroke: url(#ghostGrad);
  stroke-width: 6;
  opacity: 0.65;
  transition: stroke-dashoffset 320ms var(--ease-out-quint), opacity 0.4s ease;
}
.gauge .ghost-fill.ghost-over {
  stroke: #ef4444;
  opacity: 0.8;
}

.gauge-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 18%;
  pointer-events: none;
}
.status-emoji {
  font-size: 52px;
  line-height: 1;
  margin-bottom: 4px;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.12));
  transition: transform 0.5s var(--ease-spring);
}
.delta-value {
  font-family: var(--font-mono);
  font-size: 60px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--c-mode);
  transition: color 0.5s ease;
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
}
.delta-value .sign {
  font-size: 0.7em;
  margin-right: 2px;
  opacity: 0.85;
}
.delta-value .pct {
  font-size: 0.5em;
  margin-left: 4px;
  opacity: 0.7;
  font-weight: 500;
}
.delta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--c-line);
  margin-top: 6px;
}

/* --- Mode-enter event choreography (one-shot, then quiet) --- */
.enter-burn .status-emoji  { animation: burn-spring 320ms var(--ease-spring); }
.enter-burn .time-fill     { animation: ring-breathe 500ms ease-in-out; }

.enter-cruise .status-emoji { animation: cruise-fade 320ms ease-out; }

.enter-careful .usage-fill  { animation: careful-shake 220ms ease-in-out; }
.enter-careful .status-emoji { animation: careful-tilt 320ms ease-in-out; }

.enter-save .delta-value   { animation: save-heart 520ms var(--ease-spring); }
.enter-save .usage-fill    { animation: save-flash 380ms ease-out; }

@keyframes burn-spring {
  0%   { transform: scale(0.6); }
  60%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes ring-breathe {
  0%, 100% { stroke-width: 22; }
  50%      { stroke-width: 26; }
}
@keyframes cruise-fade {
  0% { opacity: 0.3; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes careful-shake {
  0%, 100% { transform: translateX(0) rotate(-90deg); transform-origin: 200px 200px; }
  25%      { transform: translateX(-2px) rotate(-90deg); }
  75%      { transform: translateX(2px) rotate(-90deg); }
}
@keyframes careful-tilt {
  0%, 100% { transform: rotate(0deg); }
  30%      { transform: rotate(-8deg); }
  70%      { transform: rotate(8deg); }
}
@keyframes save-heart {
  0%, 100% { transform: scale(1); }
  35%      { transform: scale(1.09); }
  70%      { transform: scale(0.98); }
}
@keyframes save-flash {
  0%   { stroke: white; }
  100% { stroke: url(#usageGrad); }
}

/* Sparkles (burn mode, capped + fading) */
.sparkle {
  position: absolute;
  font-size: 18px;
  pointer-events: none;
  opacity: 0;
  animation: floatUp 3.2s ease-out forwards;
  z-index: 0;
}
@keyframes floatUp {
  0%   { transform: translateY(0) scale(0) rotate(0deg); opacity: 0; }
  20%  { opacity: 0.9; }
  80%  { opacity: 0.9; }
  100% { transform: translateY(-120px) scale(1.2) rotate(35deg); opacity: 0; }
}

/* Reduced-motion: kill all entry animations and substitute opacity */
.is-reduced .status-emoji,
.is-reduced .delta-value,
.is-reduced .time-fill,
.is-reduced .usage-fill {
  animation: none !important;
}
.is-reduced .gauge .time-fill,
.is-reduced .gauge .usage-fill {
  transition: stroke-dashoffset 0s !important;
}

.legend {
  margin-top: 22px;
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px dashed var(--c-divider);
  width: 100%;
  max-width: 480px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.legend-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-item.time .dot {
  background: linear-gradient(135deg, var(--c-time-1), var(--c-time-2));
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.18);
}
.legend-item.usage .dot {
  background: linear-gradient(135deg, var(--c-usage-1), var(--c-usage-2));
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.18);
}
.legend-item.ghost .dot {
  background: repeating-linear-gradient(45deg, #fb923c 0 3px, transparent 3px 6px);
  border: 1px solid rgba(234, 88, 12, 0.4);
}
.legend-item .label {
  color: var(--c-mute-soft);
  font-weight: 500;
}
.legend-item .value {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--c-ink-soft);
}

@media (max-width: 560px) {
  .gauge-hero { padding: 28px 16px 24px; }
  .gauge-wrap { max-width: 300px; }
  .status-emoji { font-size: 42px; }
  .delta-value { font-size: 44px; }
}
</style>
