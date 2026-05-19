<script setup lang="ts">
import { computed } from 'vue'
import IconHourglass from '~icons/ph/hourglass-medium-fill'
import IconChartUp from '~icons/ph/chart-line-up-fill'
import IconBattery from '~icons/ph/battery-high-fill'
import type { Countdown } from '../types/burn'

const props = defineProps<{
  countdown: Countdown
  dailyBudget: number
  remainingPercent: number
}>()

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

const showSeconds = computed(() => props.countdown.days === 0 && props.countdown.hours === 0)
</script>

<template>
  <section class="metrics">
    <div class="metric card">
      <span class="eyebrow">
        <IconHourglass class="m-icon" />
        {{ $t('metrics.resetIn') }}
      </span>
      <div class="cd">
        <span class="cd-pair"><span class="cd-num num">{{ countdown.days }}</span><span class="cd-unit">d</span></span>
        <span class="cd-pair"><span class="cd-num num">{{ pad(countdown.hours) }}</span><span class="cd-unit">h</span></span>
        <span class="cd-pair"><span class="cd-num num">{{ pad(countdown.minutes) }}</span><span class="cd-unit">m</span></span>
        <span v-if="showSeconds" class="cd-pair"><span class="cd-num num">{{ pad(countdown.seconds) }}</span><span class="cd-unit">s</span></span>
      </div>
    </div>

    <div class="metric card">
      <span class="eyebrow">
        <IconChartUp class="m-icon" />
        {{ $t('metrics.dailyBudget') }}
      </span>
      <div class="metric-value">
        <span class="num">{{ dailyBudget }}</span><span class="unit">{{ $t('metrics.perDay') }}</span>
      </div>
    </div>

    <div class="metric card">
      <span class="eyebrow">
        <IconBattery class="m-icon" />
        {{ $t('metrics.quotaLeft') }}
      </span>
      <div class="metric-value">
        <span class="num">{{ remainingPercent }}</span><span class="unit">%</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.metric {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-mute-soft);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.m-icon {
  width: 14px;
  height: 14px;
  color: var(--c-flame-2);
  flex-shrink: 0;
}

.cd {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.cd-pair {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}
.cd-num {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--c-ink);
  line-height: 1;
}
.cd-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--c-line);
  font-family: var(--font-sans);
}

.metric-value {
  font-family: var(--font-mono);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--c-ink);
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.metric-value .unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--c-line);
  font-family: var(--font-sans);
  letter-spacing: 0;
}

@media (max-width: 720px) {
  .metrics { grid-template-columns: 1fr 1fr; gap: 10px; }
  /* Reset spans both columns — countdown needs the width. Tagesbudget +
     Quota übrig sit side-by-side. */
  .metric:first-child { grid-column: 1 / -1; }
  .metric {
    padding: 16px 18px;
    align-items: center;
    text-align: center;
    gap: 8px;
  }
  .cd { justify-content: center; }
  .metric-value { justify-content: center; }
}

@media (max-width: 380px) {
  .metric { padding: 14px 16px; gap: 6px; }
  .cd-num { font-size: 22px; }
  .metric-value { font-size: 24px; }
  .m-icon { width: 13px; height: 13px; }
}
</style>
