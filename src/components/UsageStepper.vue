<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import IconMinus from '~icons/ph/minus-bold'
import IconPlus from '~icons/ph/plus-bold'

const props = defineProps<{
  value: number
  min?: number
  max?: number
}>()
const emit = defineEmits<{ (e: 'change', v: number): void }>()

const min = props.min ?? 0
const max = props.max ?? 100

const holding = ref<'up' | 'down' | null>(null)
let timer: number | null = null
let tickCount = 0

function clamp(v: number): number { return Math.max(min, Math.min(max, Math.round(v))) }

function nudge(delta: number): void {
  const next = clamp(props.value + delta)
  if (next === props.value) return
  emit('change', next)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(3)
  }
}

function start(direction: 'up' | 'down'): void {
  holding.value = direction
  const delta = direction === 'up' ? 1 : -1
  nudge(delta)
  tickCount = 0

  const schedule = (): void => {
    // Accelerating cadence: 380ms → 220ms → 120ms → 80ms → 50ms (capped)
    const cadence = tickCount < 1 ? 380 : tickCount < 4 ? 220 : tickCount < 9 ? 120 : tickCount < 16 ? 80 : 50
    timer = window.setTimeout(() => {
      if (holding.value !== direction) return
      nudge(delta)
      tickCount += 1
      schedule()
    }, cadence)
  }
  schedule()
}

function stop(): void {
  holding.value = null
  if (timer !== null) { window.clearTimeout(timer); timer = null }
}

onBeforeUnmount(stop)

function onPointerDown(direction: 'up' | 'down', e: PointerEvent): void {
  e.preventDefault()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  start(direction)
}
function onPointerUp(): void { stop() }
</script>

<template>
  <div class="stepper" role="group" aria-label="Usage anpassen">
    <button
      type="button"
      class="btn btn-down"
      :class="{ active: holding === 'down' }"
      :disabled="value <= min"
      aria-label="Usage minus 1"
      @pointerdown="onPointerDown('down', $event)"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <IconMinus />
    </button>

    <div class="readout">
      <span class="number num">{{ value }}</span>
      <span class="pct">%</span>
    </div>

    <button
      type="button"
      class="btn btn-up"
      :class="{ active: holding === 'up' }"
      :disabled="value >= max"
      aria-label="Usage plus 1"
      @pointerdown="onPointerDown('up', $event)"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <IconPlus />
    </button>
  </div>
</template>

<style scoped>
.stepper {
  --row-h: 52px;
  display: grid;
  grid-template-columns: var(--row-h) 1fr var(--row-h);
  align-items: center;
  gap: 6px;
  padding: 5px;
  background: rgba(15, 23, 42, 0.035);
  border: 1px solid var(--c-hair);
  border-radius: 14px;
  user-select: none;
  touch-action: none;
}

.btn {
  width: var(--row-h);
  height: var(--row-h);
  display: grid;
  place-items: center;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: 10px;
  color: var(--c-ink);
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.btn:hover:not(:disabled) {
  border-color: rgba(234, 88, 12, 0.4);
  color: var(--c-flame-2);
  transform: translateY(-1px);
}
.btn:active:not(:disabled),
.btn.active {
  transform: scale(0.96);
  background: rgba(234, 88, 12, 0.08);
  border-color: var(--c-flame-2);
  color: var(--c-flame-2);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn :deep(svg) { width: 18px; height: 18px; }

.readout {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  height: var(--row-h);
  padding: 0 8px;
}
.number {
  font-family: var(--font-mono);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--c-ink);
  line-height: var(--row-h);
}
.pct {
  font-size: 16px;
  color: var(--c-mute-soft);
  font-weight: 500;
  font-family: var(--font-sans);
  letter-spacing: 0;
}

@media (max-width: 560px) {
  .stepper { --row-h: 46px; }
  .number { font-size: 26px; }
  .pct { font-size: 14px; }
}
</style>
