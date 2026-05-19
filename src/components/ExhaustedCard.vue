<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconBattery from '~icons/ph/battery-empty-fill'
import type { Countdown } from '../types/burn'

const props = defineProps<{
  countdown: Countdown
  resetDate: string
}>()

const { locale } = useI18n()

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

const resetDateLabel = computed(() => {
  const d = new Date(props.resetDate)
  if (!Number.isFinite(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(d)
})

const resetTimeLabel = computed(() => {
  const d = new Date(props.resetDate)
  if (!Number.isFinite(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
})

const showSeconds = computed(() => props.countdown.days === 0 && props.countdown.hours === 0)
</script>

<template>
  <section class="exhausted card" aria-live="polite">
    <div class="aurora" aria-hidden="true">
      <span class="blob blob-a" />
      <span class="blob blob-b" />
      <span class="blob blob-c" />
    </div>

    <div class="hero">
      <div class="icon-wrap" aria-hidden="true">
        <IconBattery />
      </div>
      <div class="text">
        <h2>{{ $t('exhausted.title') }}</h2>
        <p>{{ $t('exhausted.subtitle') }}</p>
      </div>
    </div>

    <div class="countdown-wrap">
      <span class="cd-label">{{ $t('exhausted.countdownLabel') }}</span>
      <div class="countdown">
        <div class="cd-unit">
          <span class="cd-num num">{{ countdown.days }}</span>
          <span class="cd-key">d</span>
        </div>
        <span class="cd-sep" aria-hidden="true">:</span>
        <div class="cd-unit">
          <span class="cd-num num">{{ pad(countdown.hours) }}</span>
          <span class="cd-key">h</span>
        </div>
        <span class="cd-sep" aria-hidden="true">:</span>
        <div class="cd-unit">
          <span class="cd-num num">{{ pad(countdown.minutes) }}</span>
          <span class="cd-key">m</span>
        </div>
        <template v-if="showSeconds">
          <span class="cd-sep" aria-hidden="true">:</span>
          <div class="cd-unit cd-unit-sec">
            <span class="cd-num num">{{ pad(countdown.seconds) }}</span>
            <span class="cd-key">s</span>
          </div>
        </template>
      </div>
    </div>

    <p class="foot">{{ $t('exhausted.footnote') }}</p>
    <p v-if="resetDateLabel" class="sub-foot">
      {{ $t('exhausted.subFootnote', { date: resetDateLabel, time: resetTimeLabel }) }}
    </p>
  </section>
</template>

<style scoped>
.exhausted {
  position: relative;
  padding: 32px 30px 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 22px;
  isolation: isolate;
}

/* === Aurora background — soft animated blobs === */
.aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}
.blob {
  position: absolute;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.42;
  animation: aurora-drift 18s ease-in-out infinite;
}
.blob-a {
  background: #fb923c;
  top: -80px;
  left: -60px;
}
.blob-b {
  background: #f43f5e;
  top: -40px;
  right: -80px;
  animation-delay: -6s;
}
.blob-c {
  background: #d946ef;
  bottom: -90px;
  left: 30%;
  animation-delay: -12s;
}
@keyframes aurora-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(20px, -16px) scale(1.08); }
  66%      { transform: translate(-14px, 14px) scale(0.94); }
}

/* === Hero === */
.hero {
  display: flex;
  align-items: center;
  gap: 16px;
}
.icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  color: white;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: 0 14px 30px -10px rgba(234, 88, 12, 0.55);
  animation: icon-breathe 2.4s ease-in-out infinite;
}
.icon-wrap :deep(svg) { width: 28px; height: 28px; }
@keyframes icon-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

.text { min-width: 0; }
.text h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.022em;
  color: var(--c-ink);
  line-height: 1.15;
}
.text p {
  margin: 4px 0 0;
  font-size: 13.5px;
  color: var(--c-mute);
  line-height: 1.5;
  letter-spacing: -0.005em;
}

/* === Countdown === */
.countdown-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 24px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  align-items: center;
}
.cd-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-mute-soft);
}
.countdown {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.cd-unit {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.cd-num {
  font-family: var(--font-mono);
  font-size: 52px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--c-ink);
  line-height: 1;
}
.cd-key {
  font-size: 16px;
  font-weight: 500;
  color: var(--c-mute);
  font-family: var(--font-sans);
  letter-spacing: -0.005em;
}
.cd-sep {
  font-family: var(--font-mono);
  font-size: 36px;
  color: var(--c-line);
  margin: 0 2px;
  line-height: 1;
}
.cd-unit-sec .cd-num {
  /* The seconds tick is fast — make it less dominant. */
  font-size: 42px;
  opacity: 0.85;
}

/* === Footer === */
.foot {
  margin: 0;
  text-align: center;
  font-size: 13.5px;
  color: var(--c-ink-soft);
  letter-spacing: -0.005em;
  line-height: 1.5;
  font-weight: 500;
}
.sub-foot {
  margin: -8px 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--c-mute-soft);
  letter-spacing: -0.005em;
}

@media (prefers-reduced-motion: reduce) {
  .blob, .icon-wrap { animation: none; }
}

@media (max-width: 560px) {
  .exhausted { padding: 24px 18px 18px; gap: 18px; }
  .hero { gap: 12px; }
  .icon-wrap { width: 48px; height: 48px; }
  .icon-wrap :deep(svg) { width: 24px; height: 24px; }
  .text h2 { font-size: 19px; }
  .countdown-wrap { padding: 18px 16px; }
  .cd-num { font-size: 42px; }
  .cd-unit-sec .cd-num { font-size: 34px; }
  .cd-sep { font-size: 28px; }
  .cd-key { font-size: 14px; }
}

@media (max-width: 380px) {
  .cd-num { font-size: 36px; }
  .cd-unit-sec .cd-num { font-size: 28px; }
  .cd-sep { font-size: 22px; }
}
</style>
