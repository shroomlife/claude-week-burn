<script setup lang="ts">
import { computed } from 'vue'
import { Command } from 'lucide-vue-next'
import type { Countdown } from '../types/burn'

const props = defineProps<{ countdown: Countdown }>()
const emit = defineEmits<{ (e: 'open-palette'): void }>()

const countdownShort = computed(() => {
  const { days, hours, minutes } = props.countdown
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${minutes}m`
})

function onKey(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    emit('open-palette')
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKey)
}
</script>

<template>
  <header class="brand">
    <div class="logo-mark" aria-hidden="true">⚡</div>
    <div class="brand-text">
      <div class="brand-name">claude burn rate</div>
      <div class="brand-tag">live weekly pace · feuer oder sparen?</div>
    </div>

    <button
      class="cmd-pill"
      type="button"
      :aria-label="`Reset in ${countdownShort}`"
      @click="emit('open-palette')"
    >
      <Command :size="13" :stroke-width="2.2" />
      <span class="cmd-letter">K</span>
      <span class="sep">·</span>
      <span class="cd num">{{ countdownShort }}</span>
    </button>
  </header>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 6px;
}
.logo-mark {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fb923c 0%, #f43f5e 70%, #d946ef 100%);
  display: grid;
  place-items: center;
  font-size: 22px;
  box-shadow: 0 12px 28px -8px rgba(244, 63, 94, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: rotate(-4deg);
  color: white;
}
.brand-text { flex: 1; min-width: 0; }
.brand-name {
  font-weight: 700;
  font-size: 21px;
  letter-spacing: -0.025em;
  line-height: 1.1;
  text-wrap: balance;
}
.brand-tag {
  font-size: 12.5px;
  color: var(--c-mute-soft);
  font-weight: 400;
  margin-top: 2px;
}
.cmd-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px 7px 11px;
  background: var(--c-glass);
  border: 1px solid var(--c-glass-border);
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 700;
  color: var(--c-mute);
  letter-spacing: 0.02em;
  transition: transform 0.15s var(--ease-spring), background 0.2s ease;
}
.cmd-pill:hover { transform: translateY(-1px); background: white; }
.cmd-letter {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-ink);
  margin-right: 1px;
}
.sep { opacity: 0.5; }
.cd {
  font-family: var(--font-mono);
  color: var(--c-ink);
  letter-spacing: -0.02em;
}

@media (max-width: 560px) {
  .logo-mark { width: 42px; height: 42px; font-size: 19px; }
  .brand-name { font-size: 18px; }
  .brand-tag { font-size: 11.5px; }
}
</style>
