<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Battery, Zap } from 'lucide-vue-next'
import type { Countdown } from '../types/burn'

const props = defineProps<{
  countdown: Countdown
  dailyBudget: number
  remainingPercent: number
}>()

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Show seconds only when in the last hour, otherwise drop them for visual calm.
const showSeconds = computed(() => props.countdown.days === 0 && props.countdown.hours === 0)
</script>

<template>
  <section class="metrics">
    <div class="metric glass countdown">
      <div class="metric-label"><Clock :size="14" :stroke-width="2" /> Reset in</div>
      <div class="metric-value">
        <div class="cd-cell">
          <span class="cd-num num">{{ countdown.days }}</span>
          <span class="cd-lbl">Tage</span>
        </div>
        <span class="cd-sep">:</span>
        <div class="cd-cell">
          <span class="cd-num num">{{ pad(countdown.hours) }}</span>
          <span class="cd-lbl">Std</span>
        </div>
        <span class="cd-sep">:</span>
        <div class="cd-cell">
          <span class="cd-num num">{{ pad(countdown.minutes) }}</span>
          <span class="cd-lbl">Min</span>
        </div>
        <template v-if="showSeconds">
          <span class="cd-sep">:</span>
          <div class="cd-cell">
            <span class="cd-num num">{{ pad(countdown.seconds) }}</span>
            <span class="cd-lbl">Sek</span>
          </div>
        </template>
      </div>
    </div>

    <div class="metric glass">
      <div class="metric-label"><Battery :size="14" :stroke-width="2" /> Daily Budget</div>
      <div class="metric-value">
        <span class="num">{{ dailyBudget }}</span><span class="unit">% / Tag</span>
      </div>
    </div>

    <div class="metric glass">
      <div class="metric-label"><Zap :size="14" :stroke-width="2" /> Quota übrig</div>
      <div class="metric-value">
        <span class="num">{{ remainingPercent }}</span><span class="unit">%</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.metrics {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 14px;
}

.metric {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.22s ease;
}

@media (hover: hover) {
  .metric:hover { transform: translateY(-2px); }
}

.metric-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--c-mute-soft);
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
  gap: 3px;
}
.metric-value .unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--c-line);
  margin-left: 4px;
  font-family: var(--font-sans);
  letter-spacing: 0.02em;
}

.countdown .metric-value {
  display: flex;
  gap: 6px;
  align-items: stretch;
}
.cd-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}
.cd-num {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--c-ink);
}
.cd-lbl {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--c-line);
  margin-top: 5px;
  font-family: var(--font-sans);
  text-transform: uppercase;
}
.cd-sep {
  font-size: 20px;
  color: #cbd5e1;
  line-height: 1;
  align-self: flex-start;
  margin-top: 2px;
  font-weight: 300;
}

@media (max-width: 880px) {
  .metrics { grid-template-columns: 1fr 1fr; }
  .metric.countdown { grid-column: 1 / -1; }
}
@media (max-width: 480px) {
  .metrics { grid-template-columns: 1fr; }
  .metric.countdown { grid-column: auto; }
}
</style>
