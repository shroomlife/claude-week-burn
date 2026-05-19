<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import IconLightning from '~icons/ph/lightning-fill'
import AuthButton from './AuthButton.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import { AUTH_ENABLED } from '../config/auth'
import type { Countdown } from '../types/burn'

const props = defineProps<{ countdown: Countdown }>()
const emit = defineEmits<{
  (e: 'open-palette'): void
  (e: 'open-account'): void
}>()

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
    <div class="brand-row">
      <div class="logo" aria-hidden="true">
        <IconLightning />
      </div>
      <div class="text">
        <div class="name">{{ $t('app.name') }}</div>
        <div class="tag">{{ $t('app.tagline') }}</div>
      </div>
    </div>

    <div class="actions">
      <LanguageSwitcher />
      <AuthButton
        v-if="AUTH_ENABLED"
        @open-menu="emit('open-palette')"
        @open-account="emit('open-account')"
      />
      <button class="cmd-pill" type="button" :aria-label="$t('header.openPalette')" @click="emit('open-palette')">
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
.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
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
.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.name {
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.022em;
  line-height: 1.15;
  color: var(--c-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag {
  font-size: 12.5px;
  color: var(--c-mute-soft);
  font-weight: 400;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cmd-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: var(--pill-h);
  padding: 0 12px;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-pill);
  box-sizing: border-box;
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

@media (max-width: 640px) {
  /* Two-row header: brand on top, actions on a second row. The cramped
     single-row layout was forcing the app name to wrap word-by-word
     because three pills + logo + tagline didn't fit ~360px wide. */
  .brand {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .brand-row { gap: 12px; }
  /* `align-self: flex-end` overrides the parent's `align-items: stretch`
     and pushes the actions inline-flex block to the right edge of the
     header. Without this, the pills bunched at the left and the language
     dropdown (anchored `right: 0`) opened off-screen to the left. */
  .actions { align-self: flex-end; gap: 6px; }
  .logo { width: 38px; height: 38px; }
  .name { font-size: 17px; }
  .tag { font-size: 12px; }
}

@media (max-width: 380px) {
  /* Super narrow — drop the kbd hint from cmd-pill and tighten padding
     so all three pills still fit on the second row without wrapping. */
  .cmd-pill { padding: 0 10px; gap: 6px; }
  .cmd-pill kbd { display: none; }
  .cmd-pill .sep { display: none; }
  .tag { font-size: 11.5px; }
}
</style>
