<script setup lang="ts">
import { computed } from 'vue'
import type { Status } from '../types/burn'

const props = defineProps<{
  timePercent: number
  usagePercent: number
  delta: number
  status: Status
}>()

const ahead = computed(() => props.delta >= 0)
const minPct = computed(() => Math.min(props.timePercent, props.usagePercent))
const maxPct = computed(() => Math.max(props.timePercent, props.usagePercent))
const verdictWord = computed(() => {
  if (props.delta === 0) return 'on pace'
  return ahead.value ? 'Headroom' : 'Overshoot'
})
const deltaSign = computed(() => (props.delta >= 0 ? '+' : '−'))

// Tick position clamped slightly so labels don't fall off the edge.
const tickLeft = computed(() => Math.min(98, Math.max(2, props.timePercent)))
</script>

<template>
  <section class="pace-card" :aria-label="`${verdictWord} ${Math.abs(delta)} Prozent`">
    <div class="pace-stack">
      <div class="pace-bar" role="img" :aria-label="`Usage ${usagePercent}%, Zeit ${timePercent}%`">
        <!-- Track -->
        <div class="track"></div>
        <!-- Delta region (between min and max) -->
        <div
          class="delta-zone"
          :class="ahead ? 'delta-ahead' : 'delta-behind'"
          :style="{ left: `${minPct}%`, width: `${maxPct - minPct}%` }"
        ></div>
        <!-- Usage fill -->
        <div class="fill" :style="{ width: `${usagePercent}%` }"></div>
        <!-- Time tick -->
        <div class="tick" :style="{ left: `${tickLeft}%` }">
          <div class="tick-line"></div>
          <div class="tick-cap" aria-hidden="true"></div>
        </div>
      </div>

      <div class="pace-legend">
        <div class="leg-item leg-usage">
          <span class="dot"></span>
          <span class="label">Usage</span>
          <span class="value num">{{ usagePercent }}%</span>
        </div>
        <div class="leg-verdict" :class="ahead ? 'is-ahead' : 'is-behind'">
          <span class="sign">{{ deltaSign }}</span>
          <span class="value num">{{ Math.abs(delta) }}%</span>
          <span class="word">{{ verdictWord }}</span>
        </div>
        <div class="leg-item leg-time">
          <span class="dot"></span>
          <span class="label">Zeit</span>
          <span class="value num">{{ timePercent }}%</span>
        </div>
      </div>

      <div class="status-line">
        <span class="emoji" aria-hidden="true">{{ status.emoji }}</span>
        <span class="status-label">{{ status.label }}</span>
        <span class="status-msg">{{ status.message }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pace-card {
  padding: 22px 24px 18px;
  background: var(--c-glass);
  border: 1px solid var(--c-glass-border);
  border-radius: var(--r-card);
  box-shadow: var(--s-card-flat);
  contain: paint;
}

.pace-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pace-bar {
  position: relative;
  height: 26px;
  border-radius: var(--r-pill);
  overflow: visible;
}

.track {
  position: absolute;
  inset: 0;
  background: var(--c-pace-track);
  border-radius: var(--r-pill);
  contain: strict;
}

.delta-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 4px;
  transition: left 320ms var(--ease-out-quint), width 320ms var(--ease-out-quint);
  z-index: 1;
}
.delta-ahead {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.35));
  box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.4);
}
.delta-behind {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.5));
  box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.55);
}

.fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: var(--r-pill);
  background: linear-gradient(90deg, var(--c-usage-1), var(--c-usage-2));
  box-shadow: 0 6px 18px -6px rgba(234, 88, 12, 0.55),
              inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: width 320ms var(--ease-out-quint);
  z-index: 2;
}

.tick {
  position: absolute;
  top: -10px;
  bottom: -10px;
  width: 0;
  z-index: 3;
  transition: left 320ms var(--ease-out-quint);
  pointer-events: none;
}
.tick-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -1.5px;
  width: 3px;
  border-radius: 2px;
  background: var(--c-ink-soft);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}
.tick-cap {
  position: absolute;
  top: -6px;
  left: -5.5px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 7px solid var(--c-ink-soft);
}

.pace-legend {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
}

.leg-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--c-mute);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.leg-item .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.leg-usage .dot {
  background: linear-gradient(135deg, var(--c-usage-1), var(--c-usage-2));
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
}
.leg-time .dot {
  background: var(--c-ink-soft);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
}
.leg-item .label { text-transform: uppercase; letter-spacing: 0.12em; font-size: 10.5px; }
.leg-item .value { color: var(--c-ink); font-family: var(--font-mono); font-size: 14px; }

.leg-verdict {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  justify-self: center;
  padding: 6px 14px;
  border-radius: var(--r-pill);
  font-weight: 800;
  letter-spacing: -0.01em;
}
.leg-verdict.is-ahead {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}
.leg-verdict.is-behind {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}
.leg-verdict .sign { font-size: 15px; font-family: var(--font-mono); }
.leg-verdict .value { font-family: var(--font-mono); font-size: 18px; letter-spacing: -0.02em; }
.leg-verdict .word { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; opacity: 0.85; }

.status-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--c-divider);
  flex-wrap: wrap;
}
.emoji { font-size: 22px; line-height: 1; }
.status-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--c-mode);
  transition: color 0.5s ease;
}
.status-msg { font-size: 13px; color: var(--c-mute); }

@media (max-width: 560px) {
  .pace-card { padding: 18px 18px 16px; }
  .pace-legend { grid-template-columns: 1fr; gap: 8px; justify-items: center; }
  .leg-verdict { justify-self: center; }
}
</style>
