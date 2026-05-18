<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import IconLightning from '~icons/ph/lightning-fill'
import AuthButton from './AuthButton.vue'
import { AUTH_ENABLED } from '../config/auth'
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

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <header class="brand">
    <div class="logo" aria-hidden="true">
      <IconLightning />
    </div>
    <div class="text">
      <div class="name">claude burn rate</div>
      <div class="tag">live weekly pace tracker</div>
    </div>

    <div class="actions">
      <AuthButton
        v-if="AUTH_ENABLED"
        @open-menu="emit('open-palette')"
      />
      <button class="cmd-pill" type="button" @click="emit('open-palette')" aria-label="Command palette öffnen">
        <kbd>⌘K</kbd>
        <span class="sep" aria-hidden="true">·</span>
        <span class="cd num">{{ countdownShort }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 4px;
}
.actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #fb923c 0%, #f43f5e 65%, #d946ef 100%);
  color: white;
  flex-shrink: 0;
}
.logo svg { width: 20px; height: 20px; }
.text { flex: 1; min-width: 0; }
.name {
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.022em;
  line-height: 1.15;
  color: var(--c-ink);
}
.tag {
  font-size: 12.5px;
  color: var(--c-mute-soft);
  font-weight: 400;
  margin-top: 2px;
}
.cmd-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-pill);
  font-size: 12px;
  color: var(--c-mute);
  transition: background 0.18s ease, transform 0.18s ease;
  cursor: pointer;
}
.cmd-pill:hover { background: rgba(15, 23, 42, 0.03); transform: translateY(-1px); }
.cmd-pill kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-ink);
  font-weight: 500;
  letter-spacing: -0.02em;
}
.sep { opacity: 0.4; }
.cd {
  font-family: var(--font-mono);
  color: var(--c-ink);
  letter-spacing: -0.02em;
  font-weight: 500;
}

@media (max-width: 560px) {
  .logo { width: 36px; height: 36px; }
  .name { font-size: 16.5px; }
  .tag { font-size: 11.5px; }
}
</style>
