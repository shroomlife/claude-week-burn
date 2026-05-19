<script setup lang="ts">
import IconWarning from '~icons/ph/warning-circle-bold'
import IconClose from '~icons/ph/x-bold'

defineProps<{ open: boolean; loggedIn: boolean; login: string | null }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'confirm'): void }>()

function cancel(): void { emit('cancel') }
function confirm(): void { emit('confirm') }
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="cancel">
      <div class="dlg" role="dialog" aria-modal="true" aria-labelledby="reset-dlg-title">
        <header class="dlg-head">
          <span class="icon-wrap" aria-hidden="true"><IconWarning /></span>
          <h2 id="reset-dlg-title">{{ $t('reset.title') }}</h2>
          <button type="button" class="close" :aria-label="$t('reset.close')" @click="cancel">
            <IconClose />
          </button>
        </header>

        <div class="body">
          <p class="lead">{{ $t('reset.lead') }}</p>

          <ul class="list">
            <li>{{ $t('reset.items.resetDate') }}</li>
            <li>{{ $t('reset.items.usage') }}</li>
            <li>{{ $t('reset.items.onboarding') }}</li>
            <li v-if="loggedIn">{{ $t('reset.items.github') }}</li>
          </ul>

          <p v-if="loggedIn" class="warn">{{ $t('reset.warn', { login: login ?? '' }) }}</p>
        </div>

        <footer class="dlg-foot">
          <button type="button" class="btn ghost" @click="cancel">{{ $t('reset.cancel') }}</button>
          <button type="button" class="btn danger" @click="confirm">{{ $t('reset.confirm') }}</button>
        </footer>
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
  padding: 14vh 16px 16px;
  z-index: 110;
}
.dlg {
  width: min(440px, 100%);
  background: white;
  border-radius: 20px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.45);
  overflow: hidden;
  border: 1px solid var(--c-hair);
  display: flex;
  flex-direction: column;
}

.dlg-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--c-hair);
}
.icon-wrap {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.1);
  color: var(--c-pace-behind);
}
.icon-wrap :deep(svg) { width: 16px; height: 16px; }
.dlg-head h2 {
  margin: 0;
  font-size: 16px;
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

.body {
  padding: 18px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--c-ink-soft);
  letter-spacing: -0.005em;
}
.list {
  list-style: none;
  margin: 0;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.035);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--c-mute);
}
.list li {
  position: relative;
  padding-left: 16px;
}
.list li::before {
  content: '·';
  position: absolute;
  left: 4px;
  color: var(--c-flame-2);
  font-weight: 700;
}

.warn {
  padding: 12px 14px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: var(--r-card-sm);
  font-size: 12.5px;
  line-height: 1.5;
  color: #991b1b;
  letter-spacing: -0.003em;
}
.warn strong { color: var(--c-pace-behind); font-weight: 600; }
.warn code {
  font-family: var(--font-mono);
  background: rgba(15, 23, 42, 0.05);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--c-ink-soft);
}

.dlg-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
}
.btn {
  padding: 9px 16px;
  border-radius: var(--r-input);
  border: 0;
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), background 0.18s ease, border-color 0.18s ease;
}
.btn.ghost {
  background: transparent;
  color: var(--c-mute);
  border: 1px solid var(--c-hair);
}
.btn.ghost:hover { background: rgba(15, 23, 42, 0.04); color: var(--c-ink); }
.btn.danger {
  background: var(--c-pace-behind);
  color: white;
}
.btn.danger:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .dlg-foot { padding: 10px 14px 14px; }
  .body { padding: 16px 18px 6px; }
}
</style>
