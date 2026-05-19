<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconDownload from '~icons/ph/download-simple-bold'
import { useInstallPrompt } from '../composables/useInstallPrompt'

const emit = defineEmits<{ (e: 'show-ios'): void }>()
const { t } = useI18n()
const installer = useInstallPrompt()

async function onClick(): Promise<void> {
  if (installer.canInstall.value) {
    await installer.install()
    return
  }
  if (installer.needsIosInstructions.value) {
    emit('show-ios')
  }
}

const visible = computed(() => {
  if (installer.isStandalone.value) return false
  return installer.canInstall.value || installer.needsIosInstructions.value
})

const label = computed(() =>
  installer.canInstall.value ? t('install.ctaApp') : t('install.ctaIos'),
)
</script>

<template>
  <div v-if="visible" class="install-cta-wrap" role="region" :aria-label="$t('install.ariaApp')">
    <button class="rainbow-btn" type="button" :aria-label="label" @click="onClick">
      <span class="rainbow-inner">
        <IconDownload class="ico" />
        <span class="lbl">{{ label }}</span>
      </span>
    </button>
    <p class="sub">{{ $t('install.subline') }}</p>
  </div>
</template>

<style scoped>
/* CSS @property lets us animate the conic-gradient angle without rotating
   the element itself — the button stays still, the colors rotate around it. */
@property --rg-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.install-cta-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 56px 18px 40px;
}

.rainbow-btn {
  position: relative;
  padding: 3px;
  border: 0;
  border-radius: var(--r-pill);
  background: conic-gradient(
    from var(--rg-angle),
    #fb923c,
    #f43f5e,
    #d946ef,
    #818cf8,
    #22d3ee,
    #10b981,
    #facc15,
    #fb923c
  );
  cursor: pointer;
  isolation: isolate;
  transition: transform 0.15s var(--ease-spring);
  animation: rainbow-angle 6s linear infinite;
}

/* Glow halo: a blurred copy of the same conic-gradient, scaled out + spinning
   in reverse for a shimmery counter-rotation. */
.rainbow-btn::before {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--rg-angle),
    #fb923c,
    #f43f5e,
    #d946ef,
    #818cf8,
    #22d3ee,
    #10b981,
    #facc15,
    #fb923c
  );
  filter: blur(20px);
  opacity: 0.55;
  z-index: -1;
  animation: rainbow-angle 8s linear infinite reverse;
}

.rainbow-btn:hover { transform: translateY(-2px); }
.rainbow-btn:active { transform: translateY(0) scale(0.98); }

.rainbow-inner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 26px;
  background: white;
  border-radius: inherit;
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: -0.01em;
}
.ico { width: 16px; height: 16px; color: var(--c-flame-2); }

.sub {
  margin: 0;
  font-size: 11.5px;
  color: var(--c-mute-soft);
  letter-spacing: 0.01em;
  text-align: center;
  text-wrap: balance;
}

@keyframes rainbow-angle {
  to { --rg-angle: 360deg; }
}

/* Fallback for browsers without @property (Firefox <128, older Safari):
   the angle stays at 0deg, colors are still beautifully visible but static.
   The animation simply has no effect. */

@media (prefers-reduced-motion: reduce) {
  .rainbow-btn,
  .rainbow-btn::before {
    animation: none;
  }
}

:global(body.is-hidden) .rainbow-btn,
:global(body.is-hidden) .rainbow-btn::before {
  animation-play-state: paused;
}

@media (max-width: 480px) {
  .install-cta-wrap { padding: 44px 14px 32px; }
  .rainbow-inner { padding: 12px 22px; font-size: 14px; }
}
</style>
