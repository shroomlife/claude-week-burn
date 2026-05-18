import { computed, type WritableComputedRef } from 'vue'
import { usePersistedState } from './usePersistedState'
import type { PersistedDataV1 } from '../types/burn'

const STORAGE_KEY = 'burnRate:v1'
const SCHEMA_VERSION = 1
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

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

function clampPercent(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

function defaultState(): PersistedDataV1 {
  return {
    resetDate: defaultResetDate(),
    usagePercent: 0,
    lastSeen: new Date().toISOString(),
    setupComplete: false,
  }
}

function validate(value: PersistedDataV1): PersistedDataV1 | null {
  if (typeof value !== 'object' || value === null) return null
  const resetDate = typeof value.resetDate === 'string' ? value.resetDate : defaultResetDate()
  const usagePercent = clampPercent(value.usagePercent)
  const lastSeen = typeof value.lastSeen === 'string' ? value.lastSeen : new Date().toISOString()
  // Existing localStorage from before the onboarding gate landed has no
  // setupComplete field — treat those users as already-onboarded so we don't
  // force them back through the intro.
  const setupComplete = typeof value.setupComplete === 'boolean' ? value.setupComplete : true
  return { resetDate, usagePercent, lastSeen, setupComplete }
}

// Singleton bound at module load. Survives HMR via the module cache.
const persisted = usePersistedState<PersistedDataV1>(STORAGE_KEY, defaultState(), {
  version: SCHEMA_VERSION,
  validate,
})

/** Internal: raw state ref. Only the sync layer should read/write this directly. */
export const _persistedBurnState = persisted

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
    persisted.value = { ...persisted.value, usagePercent: clamped, lastSeen: new Date().toISOString() }
  },
})

const setupComplete: WritableComputedRef<boolean> = computed({
  get: () => persisted.value.setupComplete,
  set: (v) => {
    if (v === persisted.value.setupComplete) return
    persisted.value = { ...persisted.value, setupComplete: v, lastSeen: new Date().toISOString() }
  },
})

export interface BurnStateApi {
  resetDate: WritableComputedRef<string>
  usagePercent: WritableComputedRef<number>
  setupComplete: WritableComputedRef<boolean>
  shiftResetByWeek: () => void
  resetWeek: () => void
  snapResetToSevenDays: () => void
  completeSetup: () => void
}

export function useBurnState(): BurnStateApi {
  return {
    resetDate,
    usagePercent,
    setupComplete,
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
    completeSetup: () => {
      if (persisted.value.setupComplete) return
      persisted.value = { ...persisted.value, setupComplete: true, lastSeen: new Date().toISOString() }
    },
  }
}

export const burnConstants = {
  WEEK_MS,
} as const
