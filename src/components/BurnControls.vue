<script setup lang="ts">
import { computed } from 'vue'
import { Globe, MapPin } from 'lucide-vue-next'

const props = defineProps<{
  usagePercent: number
  resetDate: string
  timePercent: number
  timezoneLabel: string
  weekStartLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:usagePercent', v: number): void
  (e: 'update:resetDate', v: string): void
}>()

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

function onSliderInput(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:usagePercent', clampPct(Number(target.value)))
}

function onSliderPointerDown(): void {
  document.body.classList.add('is-dragging')
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(6)
  }
}

function onSliderPointerUp(): void {
  document.body.classList.remove('is-dragging')
}

function setUsage(n: number): void {
  emit('update:usagePercent', clampPct(n))
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(4)
  }
}

function onDate(e: Event): void {
  const target = e.target as HTMLInputElement
  if (target.value) emit('update:resetDate', target.value)
}

const sliderStyle = computed(() => ({
  '--val': `${props.usagePercent}%`,
}))
</script>

<template>
  <section class="controls glass">
    <div class="control">
      <div class="control-label">📅 Weekly Reset</div>
      <input
        type="datetime-local"
        :value="resetDate"
        @change="onDate"
      />
      <div class="meta-row">
        <span class="meta-pill"><Globe :size="12" :stroke-width="2.2" /> <code>{{ timezoneLabel }}</code></span>
        <span class="meta-pill"><MapPin :size="12" :stroke-width="2.2" /> Woche ab <code>{{ weekStartLabel }}</code></span>
      </div>
    </div>

    <div class="control">
      <div class="control-label">
        <span>🔥 Weekly Usage</span>
        <span class="read num">{{ usagePercent }}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="usagePercent"
        class="usage-slider"
        :style="sliderStyle"
        @input="onSliderInput"
        @pointerdown="onSliderPointerDown"
        @pointerup="onSliderPointerUp"
        @pointercancel="onSliderPointerUp"
        @touchend="onSliderPointerUp"
        aria-label="Weekly Usage Prozent"
      />
      <div class="chips">
        <button class="chip" type="button" @click="setUsage(0)">0%</button>
        <button class="chip" type="button" @click="setUsage(25)">25%</button>
        <button class="chip" type="button" @click="setUsage(50)">50%</button>
        <button class="chip" type="button" @click="setUsage(75)">75%</button>
        <button class="chip chip-sync" type="button" @click="setUsage(timePercent)">
          = Zeit ({{ timePercent }}%)
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.controls {
  padding: 26px 28px;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 32px;
  align-items: start;
}
.control {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.control-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--c-mute);
}
.control-label .read {
  font-family: var(--font-mono);
  font-size: 17px;
  color: var(--c-flame-2);
  text-transform: none;
  letter-spacing: -0.02em;
  font-weight: 700;
}

input[type='datetime-local'] {
  font-family: var(--font-sans);
  font-size: 15px;
  padding: 13px 16px;
  border-radius: var(--r-input);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.1);
  color: var(--c-ink);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-weight: 500;
  width: 100%;
}
input[type='datetime-local']:focus-visible {
  border-color: #06b6d4;
  background: white;
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.15);
}

.usage-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 16px;
  border-radius: var(--r-pill);
  background: linear-gradient(
    to right,
    #fb923c 0%,
    #ea580c var(--val, 0%),
    rgba(15, 23, 42, 0.08) var(--val, 0%),
    rgba(15, 23, 42, 0.08) 100%
  );
  outline: none;
  cursor: pointer;
}
.usage-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: white;
  border: 3px solid #ea580c;
  cursor: grab;
  box-shadow: 0 8px 20px -4px rgba(234, 88, 12, 0.55),
              0 2px 4px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 1);
  transition: transform 0.15s ease;
}
.usage-slider::-webkit-slider-thumb:hover { transform: scale(1.12); }
.usage-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.18); }
.usage-slider::-moz-range-thumb {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: white;
  border: 3px solid #ea580c;
  cursor: grab;
  box-shadow: 0 8px 20px -4px rgba(234, 88, 12, 0.55), 0 2px 4px rgba(0, 0, 0, 0.1);
}
.usage-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3),
              0 8px 20px -4px rgba(234, 88, 12, 0.55);
}

.chips {
  display: flex;
  gap: 7px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.chip {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: var(--r-pill);
  color: var(--c-mute);
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.chip:hover {
  background: white;
  border-color: var(--c-flame-2);
  color: var(--c-flame-2);
  transform: translateY(-1px);
}
.chip-sync { border-style: dashed; }

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: var(--r-pill);
  font-size: 11px;
  font-weight: 600;
  color: var(--c-mute);
}
.meta-pill code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-ink-soft);
  font-weight: 700;
}

@media (max-width: 880px) {
  .controls { grid-template-columns: 1fr; gap: 22px; padding: 22px; }
}
</style>
