import { computed, type ComputedRef, type Ref } from 'vue'
import { useBurnState, burnConstants } from './useBurnState'
import type { Countdown, Forecast, Status } from '../types/burn'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

function buildStatus(delta: number, usage: number, preWeek: boolean, expired: boolean): Status {
  if (usage >= 100) {
    return {
      mode: 'save',
      emoji: '🚫',
      label: 'AUSGESCHÖPFT',
      message: 'Quota leer — bis Reset abwarten oder umsteigen.',
    }
  }
  if (expired) {
    return {
      mode: 'cruise',
      emoji: '🎉',
      label: 'RESET DA',
      message: 'Die Woche ist vorbei — frische Quota läuft an.',
    }
  }
  if (preWeek) {
    return {
      mode: 'careful',
      emoji: '🤔',
      label: 'PRE-WEEK',
      message: 'Woche hat noch nicht gestartet — Reset-Datum prüfen.',
    }
  }
  if (delta >= 12) {
    return {
      mode: 'burn',
      emoji: '🚀',
      label: 'FEUER FREI',
      message: 'Massig Headroom — Vollgas drücken, Bro!',
    }
  }
  if (delta >= 0) {
    return {
      mode: 'cruise',
      emoji: '🟢',
      label: 'CHILL PACE',
      message: 'Alles im Flow — pace passt perfekt.',
    }
  }
  if (delta > -12) {
    return {
      mode: 'careful',
      emoji: '⚠️',
      label: 'AUGE DRAUF',
      message: 'Bisschen flott — locker auf die Bremse treten.',
    }
  }
  return {
    mode: 'save',
    emoji: '🔋',
    label: 'SPARMODUS',
    message: 'Du brennst zu schnell — jetzt clever sparen!',
  }
}

const WEEKDAY_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const

function formatGermanDay(d: Date): string {
  return `${WEEKDAY_DE[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatGermanShortDate(d: Date): string {
  const day = WEEKDAY_DE[d.getDay()]?.slice(0, 2) ?? ''
  return `${day} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

export interface BurnComputeds {
  resetTs: ComputedRef<number>
  weekStart: ComputedRef<number>
  timeRemainingMs: ComputedRef<number>
  timePercent: ComputedRef<number>      // integer 0..100
  delta: ComputedRef<number>            // integer, can be negative
  status: ComputedRef<Status>
  countdown: ComputedRef<Countdown>
  remainingPercent: ComputedRef<number> // integer
  dailyBudget: ComputedRef<number>      // integer
  ghostUsage: ComputedRef<number>       // 0..200 projected end-of-week
  forecast: ComputedRef<Forecast>
  forecastReliable: ComputedRef<boolean> // true after ~24h elapsed within the week
  tomorrowSentence: ComputedRef<string> // "Tomorrow Robin" narrative
  preWeek: ComputedRef<boolean>
  daysUntilWeekStart: ComputedRef<number>
  weekStartLabel: ComputedRef<string>
  timezoneLabel: ComputedRef<string>
  msPerPercent: ComputedRef<number>     // WEEK_MS / 100 — constant
  msUntilNextTick: ComputedRef<number>  // until timePercent advances by 1
  nextTickProgress: ComputedRef<number> // 0..1 progress toward next tick
}

export function useBurnComputeds(now: Ref<number>): BurnComputeds {
  const { resetDate, usagePercent } = useBurnState()

  const resetTs = computed(() => {
    const t = new Date(resetDate.value).getTime()
    return Number.isFinite(t) ? t : now.value + burnConstants.WEEK_MS
  })

  const weekStart = computed(() => resetTs.value - burnConstants.WEEK_MS)

  const timeElapsedMs = computed(() =>
    Math.max(0, Math.min(burnConstants.WEEK_MS, now.value - weekStart.value)),
  )

  const timeRemainingMs = computed(() => Math.max(0, resetTs.value - now.value))

  const timePercent = computed(() =>
    Math.round((timeElapsedMs.value / burnConstants.WEEK_MS) * 100),
  )

  const delta = computed(() => timePercent.value - usagePercent.value)

  const preWeek = computed(() => now.value < weekStart.value)
  const daysUntilWeekStart = computed(() =>
    Math.max(0, (weekStart.value - now.value) / DAY_MS),
  )

  const status = computed(() =>
    buildStatus(delta.value, usagePercent.value, preWeek.value, timeRemainingMs.value <= 0),
  )

  const countdown = computed<Countdown>(() => {
    const ms = timeRemainingMs.value
    return {
      days: Math.floor(ms / DAY_MS),
      hours: Math.floor((ms % DAY_MS) / HOUR_MS),
      minutes: Math.floor((ms % HOUR_MS) / 60_000),
      seconds: Math.floor((ms % 60_000) / 1000),
    }
  })

  const remainingPercent = computed(() =>
    Math.max(0, 100 - usagePercent.value),
  )

  const daysRemaining = computed(() => timeRemainingMs.value / DAY_MS)
  const dailyBudget = computed(() => {
    if (daysRemaining.value <= 0.005) return 0
    return Math.round(remainingPercent.value / daysRemaining.value)
  })

  /** Projected end-of-week usage if current daily burn pace continues. */
  const ghostUsage = computed(() => {
    const elapsedDays = timeElapsedMs.value / DAY_MS
    if (elapsedDays < 0.5) return usagePercent.value
    const dailyPace = usagePercent.value / elapsedDays
    const total = dailyPace * 7
    return Math.min(200, Math.round(total))
  })

  /** When does the projection hit 100%? */
  const forecast = computed<Forecast>(() => {
    const elapsedDays = timeElapsedMs.value / DAY_MS
    if (elapsedDays < 0.5 || usagePercent.value === 0) {
      return { projectedEndUsage: usagePercent.value, hits100At: null, lastSafeDay: null }
    }
    const dailyPace = usagePercent.value / elapsedDays
    const projected = Math.min(200, Math.round(dailyPace * 7))
    if (dailyPace <= 0) {
      return { projectedEndUsage: projected, hits100At: null, lastSafeDay: null }
    }
    const daysTo100 = (100 - usagePercent.value) / dailyPace
    const hits100Ts = now.value + daysTo100 * DAY_MS
    const hits100At = hits100Ts < resetTs.value ? new Date(hits100Ts) : null
    const lastSafe = hits100At ? new Date(hits100Ts - DAY_MS) : null
    return { projectedEndUsage: projected, hits100At, lastSafeDay: lastSafe }
  })

  const tomorrowSentence = computed(() => {
    const f = forecast.value
    const u = usagePercent.value
    if (u >= 100) return 'Quota leer. Bis Reset chillen — oder Plan-Upgrade.'
    if (u === 0) return 'Frische Woche, jungfräuliche Quota. Volle Power.'
    const elapsedDays = timeElapsedMs.value / DAY_MS
    if (elapsedDays < 0.5) return 'Zu früh für ne ehrliche Prognose. Komm in ein paar Stunden wieder.'
    if (f.hits100At) {
      const dayLabel = formatGermanDay(f.hits100At)
      if (f.lastSafeDay) {
        const lastSafe = formatGermanShortDate(f.lastSafeDay)
        return `Wenn du so weitermachst: 100% am ${dayLabel}. ${lastSafe} wäre dein letzter Vollgastag.`
      }
      return `Wenn du so weitermachst: 100% am ${dayLabel}.`
    }
    return `Bei aktueller Pace landest du bei ${f.projectedEndUsage}%. Die Quota reicht locker.`
  })

  const weekStartLabel = computed(() =>
    new Date(weekStart.value).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
  )

  const timezoneLabel = computed(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const parts = new Date().toLocaleString('de-DE', { timeZoneName: 'short' }).split(' ')
      const abbr = parts[parts.length - 1] ?? ''
      return `${tz} · ${abbr}`
    } catch {
      return 'Lokale Zeit'
    }
  })

  // Reliability gate: forecast is reliable after ~24h elapsed.
  const forecastReliable = computed(() => {
    const elapsedDays = timeElapsedMs.value / DAY_MS
    return elapsedDays >= 1
  })

  // Time-percent tick countdown — when does timePercent advance to next integer?
  const msPerPercent = computed(() => burnConstants.WEEK_MS / 100)
  const msUntilNextTick = computed(() => {
    const nextWholeMs = (Math.floor(timeElapsedMs.value / msPerPercent.value) + 1) * msPerPercent.value
    return Math.max(0, nextWholeMs - timeElapsedMs.value)
  })
  const nextTickProgress = computed(() => {
    return 1 - msUntilNextTick.value / msPerPercent.value
  })

  return {
    resetTs,
    weekStart,
    timeRemainingMs,
    timePercent,
    delta,
    status,
    countdown,
    remainingPercent,
    dailyBudget,
    ghostUsage,
    forecast,
    forecastReliable,
    tomorrowSentence,
    preWeek,
    daysUntilWeekStart,
    weekStartLabel,
    timezoneLabel,
    msPerPercent,
    msUntilNextTick,
    nextTickProgress,
  }
}
