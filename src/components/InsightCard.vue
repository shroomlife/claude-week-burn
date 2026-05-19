<script setup lang="ts">
import { computed } from 'vue'
import QuotaRing from './QuotaRing.vue'

const props = defineProps<{
  sentence: string
  projectedEnd: number
  reliable: boolean
  timePercent: number
  usagePercent: number
  ghostUsage: number
  delta: number
}>()

const projectedTone = computed(() => {
  if (!props.reliable) return 'unknown'
  if (props.projectedEnd > 100) return 'over'
  if (props.projectedEnd > 85) return 'tight'
  return 'safe'
})
</script>

<template>
  <section class="insight card">
    <header class="head">
      <span class="eyebrow">{{ $t('insight.eyebrow') }}</span>
      <span class="proj" :class="`proj-${projectedTone}`">
        <template v-if="reliable">
          <span class="proj-label">{{ $t('insight.reichtBis') }}</span>
          <span class="num">{{ projectedEnd }}%</span>
        </template>
        <template v-else>
          <span class="proj-label">{{ $t('insight.forecast') }}</span>
          <span class="num">—</span>
        </template>
      </span>
    </header>

    <div class="body">
      <div class="signature" aria-hidden="true">
        <QuotaRing
          :time-percent="timePercent"
          :usage-percent="usagePercent"
          :ghost-usage="ghostUsage"
          :delta="delta"
          :ghost-visible="reliable"
          compact
        />
      </div>
      <p class="line">{{ sentence }}</p>
    </div>
  </section>
</template>

<style scoped>
.insight {
  padding: 18px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-hair);
}
.eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-mute-soft);
}
.proj {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--r-pill);
  letter-spacing: -0.005em;
  white-space: nowrap;
}
.proj-label {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.7;
}
.proj-safe   { background: rgba(5, 150, 105, 0.09); color: #047857; }
.proj-tight  { background: rgba(217, 119, 6, 0.1);  color: #b45309; }
.proj-over   { background: rgba(220, 38, 38, 0.09); color: #b91c1c; }
.proj-unknown{ background: rgba(15, 23, 42, 0.05); color: var(--c-mute); }
.proj .num { font-family: var(--font-mono); font-size: 14px; letter-spacing: -0.02em; }

.body {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 22px;
  align-items: center;
}

/* Strip the QuotaRing's own card chrome — it lives as a signature here */
.signature :deep(.ring-card) {
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
  display: block;
}
.signature :deep(.ring-wrap) {
  width: 180px;
  height: 180px;
}
.signature :deep(.delta .num) { font-size: 38px; }
.signature :deep(.delta .sign) { font-size: 20px; }
.signature :deep(.delta .pct) { font-size: 16px; }

.line {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 28px;
  line-height: 1.3;
  color: var(--c-ink);
  letter-spacing: -0.01em;
  text-wrap: balance;
  font-weight: 400;
}

@media (max-width: 640px) {
  .insight { padding: 16px 18px 20px; }
  .body { grid-template-columns: auto 1fr; gap: 18px; }
  .signature :deep(.ring-wrap) { width: 128px; height: 128px; }
  .signature :deep(.delta .num) { font-size: 28px; }
  .signature :deep(.delta .sign) { font-size: 16px; }
  .signature :deep(.delta .pct) { font-size: 13px; }
  .line { font-size: 20px; }
}

@media (max-width: 480px) {
  /* Ring stacked above sentence, both centered. The earlier `justify-items:
     start` left a fat gap to the right of the ring on narrow screens — now
     it's a balanced vertical column. */
  .body {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: 14px;
  }
  .signature :deep(.ring-wrap) { width: 144px; height: 144px; }
  .line { font-size: 19px; }
}
</style>
