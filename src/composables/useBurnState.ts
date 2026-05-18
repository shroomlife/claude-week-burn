import { computed, watch, type ComputedRef, type WritableComputedRef } from 'vue'
import { usePersistedState } from './usePersistedState'
import type { HistoryEntry, PersistedDataV1 } from '../types/burn'

const STORAGE_KEY = 'burnRate:v1'
const SCHEMA_VERSION = 1
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const HISTORY_MAX = 8

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function defaultResetDate(): string {
  const d = new Date()
  const day = d.getDay()
  const offset = day === 1 ? 7 : ((8 - day) % 7) || 7
  d.setDate(d.getDate() + offset)
  d.setHours(9, 0, 0, 0)
  return toLocalISO(d)
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function clampPercent(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

function defaultState(): PersistedDataV1 {
  return {
    resetDate: defaultResetDate(),
    usagePercent: 45,
    history: [],
    lastSeen: new Date().toISOString(),
  }
}

function validate(value: PersistedDataV1): PersistedDataV1 | null {
  if (typeof value !== 'object' || value === null) return null
  const resetDate = typeof value.resetDate === 'string' ? value.resetDate : defaultResetDate()
  const usagePercent = clampPercent(value.usagePercent)
  const history: HistoryEntry[] = Array.isArray(value.history)
    ? value.history
        .filter(
          (e): e is HistoryEntry =>
            typeof e === 'object' &&
            e !== null &&
            typeof (e as HistoryEntry).date === 'string' &&
            typeof (e as HistoryEntry).usagePercent === 'number',
        )
        .map((e) => ({ date: e.date, usagePercent: clampPercent(e.usagePercent) }))
        .slice(-HISTORY_MAX)
    : []
  const lastSeen = typeof value.lastSeen === 'string' ? value.lastSeen : new Date().toISOString()
  return { resetDate, usagePercent, history, lastSeen }
}

// Singleton bound at module load. Survives HMR via the module cache.
const persisted = usePersistedState<PersistedDataV1>(STORAGE_KEY, defaultState(), {
  version: SCHEMA_VERSION,
  validate,
})

const resetDate: WritableComputedRef<string> = computed({
  get: () => persisted.value.resetDate,
  set: (v) => {
    persisted.value = { ...persisted.value, resetDate: v }
  },
})

const usagePercent: WritableComputedRef<number> = computed({
  get: () => persisted.value.usagePercent,
  set: (v) => {
    const clamped = clampPercent(v)
    if (clamped === persisted.value.usagePercent) return
    persisted.value = { ...persisted.value, usagePercent: clamped }
  },
})

const history: ComputedRef<readonly HistoryEntry[]> = computed(() => persisted.value.history)

// Daily snapshot writer: one entry per date, rolling 8-day window.
watch(usagePercent, (pct) => {
  const today = todayISO()
  const list = [...persisted.value.history]
  const last = list.at(-1)
  if (last && last.date === today) {
    if (last.usagePercent === pct) return
    list[list.length - 1] = { date: today, usagePercent: pct }
  } else {
    list.push({ date: today, usagePercent: pct })
  }
  while (list.length > HISTORY_MAX) list.shift()
  persisted.value = { ...persisted.value, history: list, lastSeen: new Date().toISOString() }
})

export interface BurnStateApi {
  resetDate: WritableComputedRef<string>
  usagePercent: WritableComputedRef<number>
  history: ComputedRef<readonly HistoryEntry[]>
  shiftResetByWeek: () => void
  resetWeek: () => void
  snapResetToSevenDays: () => void
}

export function useBurnState(): BurnStateApi {
  return {
    resetDate,
    usagePercent,
    history,
    shiftResetByWeek: () => {
      const t = new Date(persisted.value.resetDate).getTime()
      const next = new Date(Number.isFinite(t) ? t + WEEK_MS : Date.now() + WEEK_MS)
      persisted.value = { ...persisted.value, resetDate: toLocalISO(next) }
    },
    resetWeek: () => {
      if (persisted.value.usagePercent === 0) return
      persisted.value = { ...persisted.value, usagePercent: 0 }
    },
    snapResetToSevenDays: () => {
      const d = new Date(Date.now() + WEEK_MS)
      persisted.value = { ...persisted.value, resetDate: toLocalISO(d) }
    },
  }
}

export const burnConstants = {
  WEEK_MS,
  HISTORY_MAX,
} as const
