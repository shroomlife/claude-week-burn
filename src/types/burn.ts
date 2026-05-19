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

export interface PersistedDataV1 {
  resetDate: string
  usagePercent: number
  lastSeen: string
  setupComplete: boolean
  /**
   * Optional local-ISO override for the current week's start time. When null,
   * weekStart is derived as resetDate - 7d. When set, this lets the user
   * shift their week boundary mid-cycle without moving the reset (e.g. they
   * got an early reset but want the end-of-week date to stay where it was).
   * Cleared automatically on the next rollover.
   */
  weekStartOverride?: string | null
  /**
   * Optional IANA timezone string (e.g. "Europe/Berlin", "America/New_York").
   * When null, all date formatting uses the browser's auto-detected zone.
   */
  timezone?: string | null
}

export interface Forecast {
  /** Projected usage at the reset moment if current daily pace holds. */
  projectedEndUsage: number
  /** Date+time when usage will hit 100% at current daily pace, or null if it won't. */
  hits100At: Date | null
  /** Last day on which user can stay at burn pace before reaching limit. */
  lastSafeDay: Date | null
}
