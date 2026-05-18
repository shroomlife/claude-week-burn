<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  weekStart: number
  msPerPercent: number
}>()

const localNow = ref(Date.now())
let timer: number | null = null

function tick(): void { localNow.value = Date.now() }
function start(): void { if (timer === null) timer = window.setInterval(tick, 1000) }
function stop(): void { if (timer !== null) { window.clearInterval(timer); timer = null } }
function onVis(): void {
  if (document.hidden) stop()
  else { tick(); start() }
}

onMounted(() => {
  start()
  document.addEventListener('visibilitychange', onVis)
})
onUnmounted(() => {
  stop()
  document.removeEventListener('visibilitychange', onVis)
})

const elapsedMs = computed(() => Math.max(0, localNow.value - props.weekStart))
const msUntilNextTick = computed(() => {
  const nextWholeMs = (Math.floor(elapsedMs.value / props.msPerPercent) + 1) * props.msPerPercent
  return Math.max(0, nextWholeMs - elapsedMs.value)
})
const progress = computed(() => Math.max(0, Math.min(1, 1 - msUntilNextTick.value / props.msPerPercent)))

const countdownLabel = computed(() => {
  const totalSec = Math.floor(msUntilNextTick.value / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
})
</script>

<template>
  <div class="strip" :title="`Nächster Pace +1% in ${countdownLabel}`">
    <div class="bar">
      <div class="fill" :style="{ width: `${progress * 100}%` }"></div>
    </div>
    <div class="meta">
      <span class="label">Nächster Zeit-Tick</span>
      <span class="count num">+1% in {{ countdownLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 8px;
  background: rgba(15, 23, 42, 0.025);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
}
.bar {
  position: relative;
  height: 3px;
  background: rgba(15, 23, 42, 0.06);
  border-radius: var(--r-pill);
  overflow: hidden;
}
.fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, var(--c-time-1, #22d3ee), var(--c-time-2, #0891b2));
  border-radius: var(--r-pill);
  transition: width 1s linear;
}
.meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c-mute-soft);
}
.count {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--c-ink-soft);
  letter-spacing: -0.02em;
}

/* When tab hidden, pause via local timer already, but freeze CSS transition too */
:global(body.is-hidden) .fill {
  transition: none;
}
</style>
