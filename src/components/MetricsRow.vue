<script setup lang="ts">
import { computed } from 'vue'
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
      <span class="eyebrow">Reset in</span>
      <div class="cd">
        <span class="cd-pair"><span class="cd-num num">{{ countdown.days }}</span><span class="cd-unit">d</span></span>
        <span class="cd-pair"><span class="cd-num num">{{ pad(countdown.hours) }}</span><span class="cd-unit">h</span></span>
        <span class="cd-pair"><span class="cd-num num">{{ pad(countdown.minutes) }}</span><span class="cd-unit">m</span></span>
        <span v-if="showSeconds" class="cd-pair"><span class="cd-num num">{{ pad(countdown.seconds) }}</span><span class="cd-unit">s</span></span>
      </div>
    </div>

    <div class="metric card">
      <span class="eyebrow">Daily Budget</span>
      <div class="metric-value">
        <span class="num">{{ dailyBudget }}</span><span class="unit">% / Tag</span>
      </div>
    </div>

    <div class="metric card">
      <span class="eyebrow">Quota übrig</span>
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
  .metrics { grid-template-columns: 1fr 1fr; }
  .metric:first-child { grid-column: 1 / -1; }
}
@media (max-width: 440px) {
  .metrics { grid-template-columns: 1fr; }
  .metric:first-child { grid-column: auto; }
}
</style>
