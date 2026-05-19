<script setup lang="ts">
import { computed } from 'vue'
import DatePicker from './DatePicker.vue'
import UsageStepper from './UsageStepper.vue'

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

const sliderStyle = computed(() => ({ '--val': `${props.usagePercent}%` }))
</script>

<template>
  <section class="controls card">
    <div class="control">
      <div class="control-label">
        <span class="eyebrow">{{ $t('controls.weeklyReset') }}</span>
      </div>
      <DatePicker
        :model-value="resetDate"
        @update:model-value="emit('update:resetDate', $event)"
      />
      <div class="meta">
        <span class="meta-pill"><code>{{ timezoneLabel }}</code></span>
        <i18n-t keypath="controls.weekFrom" tag="span" class="meta-pill" scope="global">
          <template #date><code>{{ weekStartLabel }}</code></template>
        </i18n-t>
      </div>
    </div>

    <div class="control">
      <div class="control-label">
        <span class="eyebrow">{{ $t('controls.weeklyUsage') }}</span>
      </div>

      <UsageStepper :value="usagePercent" :min="0" :max="100" @change="setUsage" />

      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="usagePercent"
        class="usage-slider"
        :style="sliderStyle"
        :aria-label="$t('controls.sliderAria')"
        @input="onSliderInput"
        @pointerdown="onSliderPointerDown"
        @pointerup="onSliderPointerUp"
        @pointercancel="onSliderPointerUp"
        @touchend="onSliderPointerUp"
      />
      <div class="chips">
        <button class="chip" type="button" @click="setUsage(0)">0</button>
        <button class="chip" type="button" @click="setUsage(25)">25</button>
        <button class="chip" type="button" @click="setUsage(50)">50</button>
        <button class="chip" type="button" @click="setUsage(75)">75</button>
        <button class="chip chip-sync" type="button" @click="setUsage(timePercent)">
          {{ $t('controls.equalsTime', { n: timePercent }) }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.controls {
  padding: 26px 30px;
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 32px;
  align-items: start;
}
.control { display: flex; flex-direction: column; gap: 12px; }
.control-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.usage-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: var(--r-pill);
  background: linear-gradient(
    to right,
    #fb923c 0%,
    #ea580c var(--val, 0%),
    rgba(15, 23, 42, 0.06) var(--val, 0%),
    rgba(15, 23, 42, 0.06) 100%
  );
  outline: none;
  cursor: pointer;
  margin-top: 4px;
}
.usage-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  border: 2px solid #ea580c;
  cursor: grab;
  transition: transform 0.15s ease;
}
.usage-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
.usage-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.15); }
.usage-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  border: 2px solid #ea580c;
  cursor: grab;
}
.usage-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.25);
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 11px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid transparent;
  border-radius: var(--r-pill);
  color: var(--c-ink-soft);
  transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;
  letter-spacing: -0.02em;
  cursor: pointer;
}
.chip:hover {
  background: rgba(15, 23, 42, 0.08);
  color: var(--c-ink);
  transform: translateY(-1px);
}
.chip-sync {
  border: 1px dashed rgba(234, 88, 12, 0.35);
  background: transparent;
  color: var(--c-flame-2);
}
.chip-sync:hover {
  background: rgba(234, 88, 12, 0.08);
  color: var(--c-flame-2);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  background: transparent;
  border: 1px solid var(--c-hair);
  border-radius: var(--r-pill);
  font-size: 11px;
  font-weight: 500;
  color: var(--c-mute);
}
.meta-pill code {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--c-ink-soft);
  font-weight: 500;
}

@media (max-width: 880px) {
  .controls { grid-template-columns: 1fr; gap: 22px; padding: 22px; }
}
</style>
