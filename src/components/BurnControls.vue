<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconPencil from '~icons/ph/pencil-simple'
import DatePicker from './DatePicker.vue'
import UsageStepper from './UsageStepper.vue'
import QuickSetConfirm from './QuickSetConfirm.vue'
import TimezoneModal from './TimezoneModal.vue'
import WeekStartModal from './WeekStartModal.vue'
import { useBurnState } from '../composables/useBurnState'

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

const { t: _t } = useI18n()
const burn = useBurnState()

function pad(n: number): string { return String(n).padStart(2, '0') }
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// === Timezone edit ===
const tzModalOpen = ref(false)
const activeTz = computed(() => {
  if (burn.timezone.value) return burn.timezone.value
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' }
})
function openTzModal(): void { tzModalOpen.value = true }
function onTzSave(v: string | null): void {
  burn.timezone.value = v
  tzModalOpen.value = false
}

// === Week start edit ===
const wsModalOpen = ref(false)
const wsAutoDerived = computed(() => {
  const t = new Date(props.resetDate).getTime()
  if (!Number.isFinite(t)) return ''
  return toLocalISO(new Date(t - WEEK_MS))
})
const wsCurrent = computed(() => burn.weekStartOverride.value ?? wsAutoDerived.value)
function openWsModal(): void { wsModalOpen.value = true }
function onWsSave(v: string | null): void {
  burn.weekStartOverride.value = v
  wsModalOpen.value = false
}

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

// Quick-set chips (0/25/50/75) now go through a confirm dialog instead of
// blowing away the current usage value with one tap. Easy to fat-finger
// otherwise — especially on mobile.
const confirmOpen = ref(false)
const pendingValue = ref(0)

function askSetUsage(n: number): void {
  const target = clampPct(n)
  if (target === props.usagePercent) return // no-op, don't show dialog
  pendingValue.value = target
  confirmOpen.value = true
}

function confirmQuickSet(): void {
  setUsage(pendingValue.value)
  confirmOpen.value = false
}

function cancelQuickSet(): void {
  confirmOpen.value = false
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
        <button
          type="button"
          class="meta-pill meta-edit"
          :class="{ 'is-override': burn.timezone.value }"
          :aria-label="$t('tz.editAria')"
          @click="openTzModal"
        >
          <code>{{ timezoneLabel }}</code>
          <IconPencil class="pencil" />
        </button>
        <button
          type="button"
          class="meta-pill meta-edit"
          :class="{ 'is-override': burn.weekStartOverride.value }"
          :aria-label="$t('weekStart.editAria')"
          @click="openWsModal"
        >
          <i18n-t keypath="controls.weekFrom" tag="span" scope="global">
            <template #date><code>{{ weekStartLabel }}</code></template>
          </i18n-t>
          <IconPencil class="pencil" />
        </button>
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
        <button class="chip" type="button" @click="askSetUsage(0)">0</button>
        <button class="chip" type="button" @click="askSetUsage(25)">25</button>
        <button class="chip" type="button" @click="askSetUsage(50)">50</button>
        <button class="chip" type="button" @click="askSetUsage(75)">75</button>
        <button class="chip" type="button" @click="askSetUsage(100)">100</button>
      </div>
    </div>
  </section>

  <QuickSetConfirm
    :open="confirmOpen"
    :current="usagePercent"
    :target="pendingValue"
    @cancel="cancelQuickSet"
    @confirm="confirmQuickSet"
  />

  <TimezoneModal
    :open="tzModalOpen"
    :current="activeTz"
    :is-override="Boolean(burn.timezone.value)"
    @cancel="tzModalOpen = false"
    @save="onTzSave"
  />

  <WeekStartModal
    :open="wsModalOpen"
    :current="wsCurrent"
    :auto-derived="wsAutoDerived"
    :is-override="Boolean(burn.weekStartOverride.value)"
    @cancel="wsModalOpen = false"
    @save="onWsSave"
  />
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
  padding: 5px 11px;
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

/* Editable variant: button-styled, clickable, with pencil affordance.
   Override state subtly tinted so the user can see "I've customised this". */
.meta-edit {
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s var(--ease-spring);
}
.meta-edit:hover {
  background: rgba(15, 23, 42, 0.04);
  border-color: rgba(15, 23, 42, 0.14);
  color: var(--c-ink);
  transform: translateY(-1px);
}
.meta-edit.is-override {
  background: rgba(234, 88, 12, 0.07);
  border-color: rgba(234, 88, 12, 0.28);
  color: var(--c-flame-2);
}
.meta-edit.is-override code { color: var(--c-flame-2); }
.meta-edit .pencil {
  width: 11px;
  height: 11px;
  opacity: 0.6;
  flex-shrink: 0;
}
.meta-edit:hover .pencil { opacity: 1; }

@media (max-width: 720px) {
  .meta {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .meta-pill {
    width: 100%;
    justify-content: space-between;
    padding: 9px 13px;
    font-size: 12px;
  }
  .meta-pill code { font-size: 12px; }
  .meta-edit .pencil { width: 13px; height: 13px; }
}

@media (max-width: 880px) {
  .controls { grid-template-columns: 1fr; gap: 22px; padding: 22px; }
}
</style>
