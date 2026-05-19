<script setup lang="ts">
import IconShare from '~icons/ph/export-bold'
import IconPlus from '~icons/ph/plus-square-bold'
import IconCheck from '~icons/ph/check-circle-bold'
import IconClose from '~icons/ph/x-bold'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

function close(): void { emit('close') }
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="close">
      <div class="dlg" role="dialog" aria-modal="true" aria-labelledby="ios-dlg-title">
        <header class="dlg-head">
          <h2 id="ios-dlg-title">{{ $t('install.ios.title') }}</h2>
          <button type="button" class="close" :aria-label="$t('reset.close')" @click="close">
            <IconClose />
          </button>
        </header>

        <p class="lead">{{ $t('install.ios.lead') }}</p>

        <ol class="steps">
          <li>
            <span class="step-num">1</span>
            <span class="step-icon"><IconShare /></span>
            <span class="step-text">
              {{ $t('install.ios.step1Text') }}
              <span class="step-hint">{{ $t('install.ios.step1Hint') }}</span>
            </span>
          </li>
          <li>
            <span class="step-num">2</span>
            <span class="step-icon"><IconPlus /></span>
            <span class="step-text">
              {{ $t('install.ios.step2Text') }}
              <span class="step-hint">{{ $t('install.ios.step2Hint') }}</span>
            </span>
          </li>
          <li>
            <span class="step-num">3</span>
            <span class="step-icon"><IconCheck /></span>
            <span class="step-text">
              {{ $t('install.ios.step3Text') }}
              <span class="step-hint">{{ $t('install.ios.step3Hint') }}</span>
            </span>
          </li>
        </ol>

        <p class="footnote">{{ $t('install.ios.footnote') }}</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.dlg-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 26, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: start center;
  padding: 12vh 16px 16px;
  z-index: 110;
}
.dlg {
  width: min(440px, 100%);
  background: white;
  border-radius: 20px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.45);
  overflow: hidden;
  border: 1px solid var(--c-hair);
  padding: 22px 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dlg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.dlg-head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--c-ink);
}
.close {
  background: transparent;
  border: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--c-mute);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.close:hover { background: rgba(15, 23, 42, 0.05); color: var(--c-ink); }
.close :deep(svg) { width: 14px; height: 14px; }

.lead {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--c-mute);
  letter-spacing: -0.005em;
}
.lead strong { color: var(--c-ink); font-weight: 600; }

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.steps li {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(15, 23, 42, 0.025);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
}
.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--c-ink);
  color: white;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.step-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(234, 88, 12, 0.1));
  border: 1px solid rgba(234, 88, 12, 0.22);
  color: var(--c-flame-2);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.step-icon :deep(svg) { width: 18px; height: 18px; }
.step-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
  color: var(--c-ink-soft);
  line-height: 1.45;
  letter-spacing: -0.005em;
  min-width: 0;
}
.step-text strong { color: var(--c-ink); font-weight: 600; }
.step-hint {
  font-size: 11.5px;
  color: var(--c-mute-soft);
  letter-spacing: 0;
}

.footnote {
  margin: 0;
  text-align: center;
  font-size: 11.5px;
  color: var(--c-mute-soft);
  padding-top: 6px;
  border-top: 1px solid var(--c-hair);
}
.footnote strong { color: var(--c-ink-soft); font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .dlg { padding: 18px 18px 14px; }
  .steps li { padding: 12px 14px; gap: 10px; }
  .step-icon { width: 34px; height: 34px; }
}
</style>
