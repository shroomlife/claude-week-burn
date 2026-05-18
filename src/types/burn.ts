export type Mode = 'burn' | 'cruise' | 'careful' | 'save'

export interface Status {
  mode: Mode
  emoji: string
  label: string
  message: string
}

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export interface HistoryEntry {
  date: string
  usagePercent: number
}

export interface PersistedDataV1 {
  resetDate: string
  usagePercent: number
  history: HistoryEntry[]
  lastSeen: string
}

export interface Forecast {
  /** Projected usage at the reset moment if current daily pace holds. */
  projectedEndUsage: number
  /** Date+time when usage will hit 100% at current daily pace, or null if it won't. */
  hits100At: Date | null
  /** Last day on which user can stay at burn pace before reaching limit. */
  lastSafeDay: Date | null
}
