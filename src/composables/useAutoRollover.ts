import { watch, type Ref } from 'vue'
import { useBurnState, burnConstants } from './useBurnState'

export interface RolloverEvent {
  shiftedBy: number      // number of weeks shifted forward
  hadGap: boolean        // true if user was away > 5min after reset
}

/**
 * Watches `now` against the reset timestamp. When now passes resetTs, shifts resetDate forward by
 * full weeks until it lies in the future and zeroes usagePercent. Emits a single callback per
 * rollover event so the UI can toast.
 */
export function useAutoRollover(
  now: Ref<number>,
  onRollover: (event: RolloverEvent) => void,
): void {
  const burn = useBurnState()
  const GAP_MS = 5 * 60 * 1000

  watch(
    now,
    (nowMs) => {
      const resetTs = new Date(burn.resetDate.value).getTime()
      if (!Number.isFinite(resetTs)) return
      if (nowMs <= resetTs) return

      const overshoot = nowMs - resetTs
      const weeks = Math.floor(overshoot / burnConstants.WEEK_MS) + 1
      for (let i = 0; i < weeks; i += 1) burn.shiftResetByWeek()
      burn.resetWeek()
      onRollover({ shiftedBy: weeks, hadGap: overshoot > GAP_MS })
    },
    { immediate: true },
  )
}
