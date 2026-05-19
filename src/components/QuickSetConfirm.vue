<script setup lang="ts">
import { watch } from 'vue'
import IconArrowRight from '~icons/ph/arrow-right-bold'
import IconClose from '~icons/ph/x-bold'

const props = defineProps<{
  open: boolean
  current: number
  target: number
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()

function cancel(): void { emit('cancel') }
function confirm(): void { emit('confirm') }

function onKey(e: KeyboardEvent): void {
  if (!props.open) return
  if (e.key === 'Escape') cancel()
  if (e.key === 'Enter') confirm()
}

watch(() => props.open, (open) => {
  if (open) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="cancel">
      <transition name="card">
        <div v-if="open" class="dlg" role="dialog" aria-modal="true" aria-labelledby="qs-dlg-title">
          <header class="dlg-head">
            <h2 id="qs-dlg-title">{{ $t('quickSet.title', { target }) }}</h2>
            <button type="button" class="close" :aria-label="$t('account.close')" @click="cancel">
              <IconClose />
            </button>
          </header>

          <p class="body">{{ $t('quickSet.body', { current, target }) }}</p>

          <!-- Visual delta — current → target -->
          <div class="delta-strip" aria-hidden="true">
            <div class="delta-side">
              <span class="delta-label">{{ current }}%</span>
            </div>
            <IconArrowRight class="delta-arrow" />
            <div class="delta-side delta-target">
              <span class="delta-label">{{ target }}%</span>
            </div>
          </div>

          <footer class="dlg-foot">
            <button type="button" class="btn ghost" @click="cancel">{{ $t('quickSet.cancel') }}</button>
            <button type="button" class="btn primary" @click="confirm">{{ $t('quickSet.confirm') }}</button>
          </footer>
        </div>
      </transition>
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
  width: min(380px, 100%);
  background: white;
  border-radius: 20px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.45);
  overflow: hidden;
  border: 1px solid var(--c-hair);
  display: flex;
  flex-direction: column;
}

.dlg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px 4px;
}
.dlg-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--c-ink);
  text-wrap: balance;
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
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.close:hover { background: rgba(15, 23, 42, 0.05); color: var(--c-ink); }
.close :deep(svg) { width: 14px; height: 14px; }

.body {
  margin: 0;
  padding: 0 18px;
  font-size: 13.5px;
  color: var(--c-mute);
  line-height: 1.55;
  letter-spacing: -0.005em;
}

.delta-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 18px;
  padding: 14px 18px;
  background: rgba(15, 23, 42, 0.025);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
}
.delta-side {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex: 1;
}
.delta-label {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--c-mute-soft);
}
.delta-target .delta-label {
  color: var(--c-flame-2);
}
.delta-arrow {
  width: 22px;
  height: 22px;
  color: var(--c-flame-2);
  flex-shrink: 0;
}

.dlg-foot {
  display: flex;
  gap: 8px;
  padding: 12px 18px 18px;
}
.btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--r-input);
  border: 1px solid transparent;
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.btn.ghost {
  background: transparent;
  color: var(--c-mute);
  border-color: var(--c-hair);
}
.btn.ghost:hover { background: rgba(15, 23, 42, 0.04); color: var(--c-ink); transform: translateY(-1px); }
.btn.primary {
  background: var(--c-ink);
  color: white;
}
.btn.primary:hover { background: #1e293b; transform: translateY(-1px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.card-enter-active { transition: opacity 0.2s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
.card-leave-active { transition: opacity 0.16s ease, transform 0.2s ease; }
.card-enter-from { opacity: 0; transform: translateY(10px) scale(0.985); }
.card-leave-to { opacity: 0; transform: translateY(-4px) scale(0.985); }

@media (prefers-reduced-motion: reduce) {
  .card-enter-active, .card-leave-active { transition: opacity 0.2s ease; }
  .card-enter-from, .card-leave-to { transform: none; }
}

@media (max-width: 420px) {
  .dlg-foot { flex-direction: column; }
}
</style>
