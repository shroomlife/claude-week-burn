<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import IconCalendar from '~icons/ph/calendar-blank'
import IconChevronLeft from '~icons/ph/caret-left-bold'
import IconChevronRight from '~icons/ph/caret-right-bold'

const props = defineProps<{
  /** Local ISO datetime string: "YYYY-MM-DDTHH:mm" */
  modelValue: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const { locale } = useI18n()

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function parseLocal(s: string): Date {
  const d = new Date(s)
  if (Number.isFinite(d.getTime())) return d
  return new Date()
}

const isOpen = ref(false)
const triggerEl = ref<HTMLButtonElement | null>(null)
const popoverEl = ref<HTMLDivElement | null>(null)

const current = computed(() => parseLocal(props.modelValue))
const viewMonth = ref<{ y: number; m: number }>({ y: current.value.getFullYear(), m: current.value.getMonth() })

watch(() => props.modelValue, () => {
  const d = parseLocal(props.modelValue)
  viewMonth.value = { y: d.getFullYear(), m: d.getMonth() }
})

// Floating position for the popover (rendered into body via Teleport)
const popStyle = ref<Record<string, string>>({})

function updatePopPosition(): void {
  if (!triggerEl.value || !isOpen.value) return
  const rect = triggerEl.value.getBoundingClientRect()
  const width = Math.min(360, Math.max(300, rect.width))
  const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left))
  const top = rect.bottom + 6
  popStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    'max-height': `calc(100vh - ${top + 16}px)`,
  }
}

function open(): void {
  isOpen.value = true
  const d = current.value
  viewMonth.value = { y: d.getFullYear(), m: d.getMonth() }
  nextTick(() => {
    updatePopPosition()
    popoverEl.value?.focus()
  })
}
function close(): void { isOpen.value = false }

onClickOutside(popoverEl, () => { if (isOpen.value) close() }, { ignore: [triggerEl] })

useEventListener(window, 'resize', updatePopPosition)
useEventListener(window, 'scroll', updatePopPosition, { passive: true, capture: true })

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
})

function commit(d: Date): void {
  emit('update:modelValue', toLocalISO(d))
}

const triggerLabel = computed(() => {
  const d = current.value
  // Use Intl with the current locale for the weekday + date — no more
  // hardcoded German abbreviations.
  const weekday = new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(d)
  const date = new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
  return `${weekday}, ${date} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function setRelative(offsetDays: number, hour = 22, minute = 0): void {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  commit(d)
  close()
}
function setNextWeekday(targetDay: number, hour = 9, minute = 0): void {
  const d = new Date()
  const day = d.getDay()
  let diff = targetDay - day
  if (diff <= 0) diff += 7
  d.setDate(d.getDate() + diff)
  d.setHours(hour, minute, 0, 0)
  commit(d)
  close()
}

interface Cell { date: Date; outOfMonth: boolean; isToday: boolean; isSelected: boolean }
const cells = computed<Cell[]>(() => {
  const y = viewMonth.value.y
  const m = viewMonth.value.m
  const first = new Date(y, m, 1)
  const offset = (first.getDay() + 6) % 7 // Monday-start
  const start = new Date(y, m, 1 - offset)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const sel = current.value
  const selKey = `${sel.getFullYear()}-${sel.getMonth()}-${sel.getDate()}`
  const list: Cell[] = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    list.push({
      date: d,
      outOfMonth: d.getMonth() !== m,
      isToday: key === todayKey,
      isSelected: key === selKey,
    })
  }
  return list
})

const monthLabel = computed(() => {
  const { y, m } = viewMonth.value
  return new Date(y, m, 1).toLocaleString(locale.value, { month: 'long', year: 'numeric' })
})

function shiftMonth(delta: number): void {
  const next = new Date(viewMonth.value.y, viewMonth.value.m + delta, 1)
  viewMonth.value = { y: next.getFullYear(), m: next.getMonth() }
}

function pickDay(cell: Cell): void {
  const d = new Date(cell.date)
  const cur = current.value
  d.setHours(cur.getHours(), cur.getMinutes(), 0, 0)
  commit(d)
}

const hour = computed(() => current.value.getHours())
const minute = computed(() => current.value.getMinutes())

function setTime(h: number, mn: number): void {
  const d = new Date(current.value)
  d.setHours(Math.max(0, Math.min(23, h)), Math.max(0, Math.min(59, mn)), 0, 0)
  commit(d)
}
function nudgeHour(delta: number): void { setTime(hour.value + delta, minute.value) }
function nudgeMinute(delta: number): void {
  const total = hour.value * 60 + minute.value + delta * 15
  const clamped = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  setTime(Math.floor(clamped / 60), clamped % 60)
}

const TIME_PRESETS: { label: string; h: number; m: number }[] = [
  { label: '06:00', h: 6, m: 0 },
  { label: '09:00', h: 9, m: 0 },
  { label: '18:00', h: 18, m: 0 },
  { label: '22:00', h: 22, m: 0 },
]

// Localised short weekday names, Monday-start. Uses a fixed reference week
// (Jan 2024 — Jan 1 was a Monday) so Intl gives us the abbreviation per locale.
const WEEKDAYS = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
  const ref = new Date(2024, 0, 1) // Monday 2024-01-01
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ref)
    d.setDate(ref.getDate() + i)
    return fmt.format(d)
  })
})
</script>

<template>
  <div class="picker">
    <button ref="triggerEl" class="trigger" type="button" :aria-expanded="isOpen" @click="open">
      <IconCalendar class="trigger-icon" />
      <span class="trigger-label num">{{ triggerLabel }}</span>
    </button>

    <Teleport to="body">
      <transition name="pop">
        <div
          v-if="isOpen"
          ref="popoverEl"
          class="popover"
          :style="popStyle"
          tabindex="-1"
          role="dialog"
          :aria-label="$t('datepicker.ariaLabel')"
        >
          <div class="chips-row">
            <button class="chip" type="button" @click="setRelative(0, 22, 0)">{{ $t('datepicker.presets.today22') }}</button>
            <button class="chip" type="button" @click="setRelative(1, 9, 0)">{{ $t('datepicker.presets.tomorrow9') }}</button>
            <button class="chip" type="button" @click="setNextWeekday(1, 9, 0)">{{ $t('datepicker.presets.nextMonday') }}</button>
            <button class="chip" type="button" @click="setRelative(7, current.getHours(), current.getMinutes())">{{ $t('datepicker.presets.in7days') }}</button>
          </div>

          <div class="cal-head">
            <button class="nav" type="button" :aria-label="$t('datepicker.prevMonth')" @click="shiftMonth(-1)">
              <IconChevronLeft />
            </button>
            <span class="cal-month">{{ monthLabel }}</span>
            <button class="nav" type="button" :aria-label="$t('datepicker.nextMonth')" @click="shiftMonth(1)">
              <IconChevronRight />
            </button>
          </div>

          <div class="cal-grid">
            <span v-for="w in WEEKDAYS" :key="w" class="cal-dow">{{ w }}</span>
            <button
              v-for="(c, i) in cells"
              :key="i"
              type="button"
              class="cal-cell"
              :class="{
                'is-out': c.outOfMonth,
                'is-today': c.isToday,
                'is-selected': c.isSelected,
              }"
              @click="pickDay(c)"
            >
              {{ c.date.getDate() }}
            </button>
          </div>

          <div class="time-row">
            <div class="time-controls">
              <div class="time-stepper">
                <button type="button" class="step" :aria-label="$t('datepicker.hourMinus')" @click="nudgeHour(-1)">−</button>
                <span class="time-readout num">{{ pad(hour) }}:{{ pad(minute) }}</span>
                <button type="button" class="step" :aria-label="$t('datepicker.hourPlus')" @click="nudgeHour(1)">+</button>
              </div>
              <div class="minute-stepper">
                <button type="button" class="step small" :aria-label="$t('datepicker.minuteMinus')" @click="nudgeMinute(-1)">−15m</button>
                <button type="button" class="step small" :aria-label="$t('datepicker.minutePlus')" @click="nudgeMinute(1)">+15m</button>
              </div>
            </div>
            <div class="time-presets">
              <button
                v-for="t in TIME_PRESETS"
                :key="t.label"
                type="button"
                class="chip chip-time"
                :class="{ active: hour === t.h && minute === t.m }"
                @click="setTime(t.h, t.m)"
              >{{ t.label }}</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.picker { position: relative; width: 100%; }
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-input);
  color: var(--c-ink);
  font-size: 14.5px;
  font-weight: 500;
  text-align: left;
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
}
.trigger:hover { border-color: rgba(15, 23, 42, 0.14); }
.trigger:focus-visible {
  outline: none;
  border-color: var(--c-flame-2);
  box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.18);
}
.trigger-label { letter-spacing: -0.005em; }
.trigger-icon { width: 15px; height: 15px; color: var(--c-mute); flex-shrink: 0; }
</style>

<style>
/* Popover is rendered to body via Teleport — keep these unscoped */
.popover {
  background: var(--c-surface, #fff);
  border: 1px solid var(--c-hair, rgba(15, 23, 42, 0.06));
  border-radius: 16px;
  box-shadow: 0 24px 48px -16px rgba(15, 23, 42, 0.22), 0 4px 12px -4px rgba(15, 23, 42, 0.08);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 200;
  overflow-y: auto;
}

.popover .chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.popover .chip {
  font-family: 'Outfit Variable', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid transparent;
  border-radius: 999px;
  color: #1e293b;
  transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;
  cursor: pointer;
}
.popover .chip:hover {
  background: rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}
.popover .chip-time { padding: 5px 9px; font-family: 'JetBrains Mono Variable', ui-monospace, monospace; }
.popover .chip-time.active {
  background: #0a0e1a;
  color: white;
}

.popover .cal-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
}
.popover .cal-month {
  font-size: 13px;
  font-weight: 600;
  color: #0a0e1a;
  text-align: center;
  letter-spacing: -0.005em;
}
.popover .nav {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #475569;
  background: transparent;
  border: 0;
  transition: background 0.15s ease;
  cursor: pointer;
}
.popover .nav:hover { background: rgba(15, 23, 42, 0.05); color: #0a0e1a; }
.popover .nav svg { width: 14px; height: 14px; }

.popover .cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.popover .cal-dow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #64748b;
  text-align: center;
  padding: 4px 0 6px;
}
.popover .cal-cell {
  font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
  font-size: 12.5px;
  font-weight: 500;
  color: #1e293b;
  padding: 8px 0;
  border-radius: 8px;
  background: transparent;
  border: 0;
  transition: background 0.15s ease, color 0.15s ease;
  letter-spacing: -0.02em;
  cursor: pointer;
}
.popover .cal-cell.is-out { color: rgba(15, 23, 42, 0.28); }
.popover .cal-cell.is-today {
  color: #ea580c;
  font-weight: 700;
}
.popover .cal-cell.is-selected {
  background: #0a0e1a;
  color: white;
}
.popover .cal-cell.is-selected.is-today { background: #ea580c; color: white; }
.popover .cal-cell:hover:not(.is-selected) { background: rgba(15, 23, 42, 0.05); }

.popover .time-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}
.popover .time-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.popover .time-stepper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.popover .time-readout {
  font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: #0a0e1a;
  min-width: 70px;
  text-align: center;
}
.popover .step {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  background: rgba(15, 23, 42, 0.04);
  border: 0;
  transition: background 0.15s ease, color 0.15s ease;
  cursor: pointer;
}
.popover .step:hover { background: rgba(15, 23, 42, 0.08); color: #0a0e1a; }
.popover .step.small {
  width: auto;
  padding: 0 9px;
  font-size: 11.5px;
  font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
}
.popover .minute-stepper {
  display: inline-flex;
  gap: 4px;
}
.popover .time-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pop-enter-active, .pop-leave-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top center;
}
.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
