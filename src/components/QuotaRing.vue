<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  timePercent: number
  usagePercent: number
  ghostUsage: number
  delta: number
  ghostVisible?: boolean
  compact?: boolean
}>()

const TIME_R = 64
const USAGE_R = 48
const GHOST_R = 56
const TIME_C = 2 * Math.PI * TIME_R
const USAGE_C = 2 * Math.PI * USAGE_R
const GHOST_C = 2 * Math.PI * GHOST_R

const timeOff = computed(() => TIME_C * (1 - Math.min(100, props.timePercent) / 100))
const usageOff = computed(() => USAGE_C * (1 - Math.min(100, props.usagePercent) / 100))
const ghostOff = computed(() => GHOST_C * (1 - Math.min(100, props.ghostUsage) / 100))

const showGhost = computed(() => props.ghostVisible !== false && props.ghostUsage > props.usagePercent + 2)
const ghostOver = computed(() => props.ghostUsage > 100)
const ahead = computed(() => props.delta >= 0)
const sign = computed(() => (props.delta >= 0 ? '+' : '−'))
</script>

<template>
  <section class="ring-card card" :aria-label="`Headroom ${sign}${Math.abs(delta)} Prozent`">
    <div class="ring-wrap">
      <svg viewBox="0 0 160 160" class="ring">
        <defs>
          <linearGradient id="qr-timeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22d3ee" />
            <stop offset="100%" stop-color="#0891b2" />
          </linearGradient>
          <linearGradient id="qr-usageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb923c" />
            <stop offset="100%" stop-color="#ea580c" />
          </linearGradient>
        </defs>

        <circle cx="80" cy="80" :r="TIME_R" class="time-track" />
        <circle
          cx="80" cy="80" :r="TIME_R"
          class="time-fill"
          transform="rotate(-90 80 80)"
          :stroke-dasharray="TIME_C"
          :stroke-dashoffset="timeOff"
        />

        <circle
          v-if="showGhost"
          cx="80" cy="80" :r="GHOST_R"
          class="ghost-fill"
          :class="{ over: ghostOver }"
          transform="rotate(-90 80 80)"
          :stroke-dasharray="`3 4`"
          :stroke-dashoffset="ghostOff"
        />

        <circle cx="80" cy="80" :r="USAGE_R" class="usage-track" />
        <circle
          cx="80" cy="80" :r="USAGE_R"
          class="usage-fill"
          transform="rotate(-90 80 80)"
          :stroke-dasharray="USAGE_C"
          :stroke-dashoffset="usageOff"
        />
      </svg>
      <div class="center">
        <div class="delta" :class="ahead ? 'is-ahead' : 'is-behind'">
          <span class="sign">{{ sign }}</span><span class="num">{{ Math.abs(delta) }}</span><span class="pct">%</span>
        </div>
      </div>
    </div>

    <div v-if="!compact" class="legend">
      <span class="leg leg-usage"><span class="dot"></span>Usage <span class="num">{{ usagePercent }}%</span></span>
      <span class="leg leg-time"><span class="dot"></span>Zeit <span class="num">{{ timePercent }}%</span></span>
      <span v-if="showGhost" class="leg leg-ghost"><span class="dot"></span>Projektion <span class="num">{{ Math.min(200, ghostUsage) }}%</span></span>
    </div>
  </section>
</template>

<style scoped>
.ring-card {
  padding: 20px 24px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 22px;
  align-items: center;
}
.ring-wrap { position: relative; width: 160px; height: 160px; flex-shrink: 0; }
.ring { width: 100%; height: 100%; overflow: visible; }
.ring circle { fill: none; stroke-linecap: round; }
.time-track  { stroke: rgba(8, 145, 178, 0.1); stroke-width: 6; }
.time-fill   { stroke: url(#qr-timeGrad); stroke-width: 6; transition: stroke-dashoffset 0.6s linear; }
.usage-track { stroke: rgba(234, 88, 12, 0.1); stroke-width: 6; }
.usage-fill  { stroke: url(#qr-usageGrad); stroke-width: 6; transition: stroke-dashoffset 320ms var(--ease-out-quint); }
.ghost-fill  {
  stroke: rgba(234, 88, 12, 0.45);
  stroke-width: 3;
  transition: stroke-dashoffset 320ms var(--ease-out-quint), stroke 0.3s ease;
}
.ghost-fill.over { stroke: rgba(220, 38, 38, 0.6); }

:global(body.is-dragging) .usage-fill { transition: none !important; }

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  gap: 2px;
}
.delta {
  font-family: var(--font-mono);
  font-weight: 600;
  letter-spacing: -0.04em;
  display: inline-flex;
  align-items: baseline;
  transition: color 0.4s ease;
}
.delta.is-ahead  { color: var(--c-pace-ahead); }
.delta.is-behind { color: var(--c-pace-behind); }
.delta .sign { font-size: 18px; margin-right: 1px; opacity: 0.9; }
.delta .num { font-size: 32px; }
.delta .pct { font-size: 14px; opacity: 0.7; margin-left: 2px; font-family: var(--font-sans); font-weight: 500; }
.lbl {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-mute-soft);
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.leg {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--c-mute);
  letter-spacing: -0.005em;
}
.leg .num { font-family: var(--font-mono); color: var(--c-ink); margin-left: auto; font-weight: 600; }
.leg .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.leg-usage .dot { background: var(--c-flame-2); }
.leg-time  .dot { background: linear-gradient(135deg, #22d3ee, #0891b2); }
.leg-ghost .dot {
  background: transparent;
  border: 1.5px dashed rgba(234, 88, 12, 0.6);
  width: 9px; height: 9px;
}

@media (max-width: 560px) {
  .ring-card { grid-template-columns: 1fr; justify-items: center; gap: 14px; padding: 18px; }
  .ring-wrap { width: 140px; height: 140px; }
  .legend { width: 100%; max-width: 280px; }
}
</style>
