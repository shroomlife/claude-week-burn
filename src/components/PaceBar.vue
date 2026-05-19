<script setup lang="ts">
import { computed } from 'vue'
import NextTickStrip from './NextTickStrip.vue'
import type { Status } from '../types/burn'

const props = defineProps<{
  timePercent: number
  usagePercent: number
  delta: number
  status: Status
  weekStart: number
  msPerPercent: number
}>()

const ahead = computed(() => props.delta >= 0)
const minPct = computed(() => Math.min(props.timePercent, props.usagePercent))
const deltaWidth = computed(() => Math.max(0, Math.max(props.timePercent, props.usagePercent) - minPct.value))
const tickLeft = computed(() => Math.min(99, Math.max(1, props.timePercent)))
const deltaSign = computed(() => (props.delta >= 0 ? '+' : '−'))
</script>

<template>
  <section class="pace-card card">
    <div class="rail">
      <span class="rail-tip rail-tip-left">
        <span class="dot dot-usage" aria-hidden="true"></span>
        {{ $t('pace.usage') }} <span class="num">{{ usagePercent }}%</span>
      </span>
      <span class="rail-verdict" :class="ahead ? 'is-ahead' : 'is-behind'">
        <span class="sign">{{ deltaSign }}</span><span class="num">{{ Math.abs(delta) }}</span>%
        <span class="word">{{ ahead ? $t('pace.headroom') : $t('pace.overshoot') }}</span>
      </span>
      <span class="rail-tip rail-tip-right">
        {{ $t('pace.time') }} <span class="num">{{ timePercent }}%</span>
        <span class="dot dot-time" aria-hidden="true"></span>
      </span>
    </div>

    <div class="bar" role="img" :aria-label="$t('pace.ariaBar', { usage: usagePercent, time: timePercent })">
      <!-- Clipping wrapper: pill-rounded + overflow hidden so every fill /
           delta-zone layer abuts cleanly without each one carrying its own
           border-radius that collides at the seam. The tick lives OUTSIDE
           this wrapper so its small overshoot top/bottom isn't clipped. -->
      <div class="bar-clip">
        <div class="track"></div>
        <div
          class="delta-zone"
          :class="ahead ? 'delta-ahead' : 'delta-behind'"
          :style="{ left: `${minPct}%`, width: `${deltaWidth}%` }"
        ></div>
        <div class="fill" :style="{ width: `${usagePercent}%` }"></div>
      </div>
      <div class="tick" :style="{ left: `${tickLeft}%` }">
        <div class="tick-line"></div>
      </div>
    </div>

    <div class="status-row">
      <span class="status-dot" aria-hidden="true"></span>
      <span class="status-label">{{ status.label.toLowerCase() }}</span>
      <span class="status-msg">{{ status.message }}</span>
    </div>

    <NextTickStrip :week-start="weekStart" :ms-per-percent="msPerPercent" />
  </section>
</template>

<style scoped>
.pace-card {
  padding: 24px 28px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rail {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: var(--c-mute);
}
.rail-tip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.rail-tip-right { justify-self: end; }
.rail-tip .num { color: var(--c-ink); font-weight: 600; }
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot-usage { background: var(--c-flame-2); }
.dot-time  { background: var(--c-ink-soft); }

.rail-verdict {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.rail-verdict .word {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: lowercase;
  opacity: 0.85;
  margin-left: 4px;
}
.rail-verdict.is-ahead  { color: var(--c-pace-ahead); }
.rail-verdict.is-behind { color: var(--c-pace-behind); }
.rail-verdict .num { font-size: 18px; }

.bar {
  position: relative;
  height: 14px;
}
.bar-clip {
  position: absolute;
  inset: 0;
  border-radius: var(--r-pill);
  overflow: hidden;
}
.track {
  position: absolute;
  inset: 0;
  background: var(--c-pace-track);
}
.delta-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  transition: left 320ms var(--ease-out-quint), width 320ms var(--ease-out-quint);
  z-index: 1;
}
.delta-ahead {
  background: var(--c-pace-ahead-soft);
}
.delta-behind {
  background: var(--c-pace-behind-soft);
}
.fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(90deg, var(--c-flame-1), var(--c-flame-2));
  transition: width 320ms var(--ease-out-quint);
  z-index: 2;
}
.tick {
  /* Tick sits OUTSIDE the clipped bar so it can extend a few px top/bottom.
     z-index is still useful even though it's a sibling of .bar — we want
     it above any neighboring strips drawn after. */
  position: absolute;
  top: -6px;
  bottom: -6px;
  width: 0;
  z-index: 3;
  transition: left 320ms var(--ease-out-quint);
  pointer-events: none;
}
.tick-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -1px;
  width: 2px;
  border-radius: 2px;
  background: var(--c-ink);
}

/* Suspend ring transition during drag for direct feedback */
:global(body.is-dragging) .fill,
:global(body.is-dragging) .tick,
:global(body.is-dragging) .delta-zone {
  transition: none !important;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--c-mute);
  flex-wrap: wrap;
}
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--c-mode);
  flex-shrink: 0;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-mode) 14%, transparent);
  transition: background 0.5s ease;
}
.status-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: -0.005em;
}
.status-msg {
  font-size: 13px;
  color: var(--c-mute);
}

@media (max-width: 560px) {
  .pace-card { padding: 20px 18px 18px; }
  .rail { grid-template-columns: 1fr; gap: 8px; justify-items: center; }
  .rail-tip-right { justify-self: center; }
}
</style>
