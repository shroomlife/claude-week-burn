<script setup lang="ts">
import { computed, watch } from 'vue'
import IconGithub from '~icons/ph/github-logo'
import IconArrow from '~icons/ph/arrow-square-out'
import IconCheck from '~icons/ph/check-circle'
import IconWarning from '~icons/ph/warning-circle'
import { useGitHubAuth } from '../composables/useGitHubAuth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const auth = useGitHubAuth()

const codePretty = computed(() => {
  const c = auth.challenge.value?.userCode ?? ''
  if (c.length === 9 && c.includes('-')) return c
  if (c.length === 8) return `${c.slice(0, 4)}-${c.slice(4)}`
  return c
})

async function copyCode(): Promise<void> {
  const c = auth.challenge.value?.userCode
  if (c && navigator.clipboard) {
    await navigator.clipboard.writeText(c)
  }
}

function openGitHub(): void {
  if (auth.challenge.value) {
    window.open(auth.challenge.value.verificationUriComplete, '_blank', 'noopener,noreferrer')
  }
}

function start(): void {
  void auth.startDeviceFlow()
}

function close(): void {
  auth.cancelDeviceFlow()
  emit('close')
}

watch(() => props.open, (yes) => {
  if (yes && auth.phase.value === 'idle') {
    start()
  }
})

watch(() => auth.phase.value, (p) => {
  if (p === 'success') {
    window.setTimeout(() => emit('close'), 900)
  }
})
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="close">
      <div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <header class="dlg-head">
          <IconGithub />
          <h2 id="dlg-title">Mit GitHub anmelden</h2>
          <button type="button" class="close" @click="close" aria-label="Schließen">✕</button>
        </header>

        <div v-if="auth.phase.value === 'requesting'" class="dlg-body">
          <p>Login wird gestartet…</p>
        </div>

        <div v-else-if="auth.phase.value === 'awaiting-user' && auth.challenge.value" class="dlg-body">
          <p class="lead">
            Klicke auf <strong>Auf GitHub bestätigen</strong>, melde dich bei GitHub an
            (falls noch nicht geschehen) und gib diesen Code ein:
          </p>

          <button type="button" class="code-box" @click="copyCode" :title="'Code kopieren'">
            <span class="code num">{{ codePretty }}</span>
            <span class="code-hint">klick zum Kopieren</span>
          </button>

          <button type="button" class="primary" @click="openGitHub">
            <IconArrow />
            Auf GitHub bestätigen
          </button>

          <p class="meta">Wir warten auf deine Bestätigung. Dauert meistens unter 30 Sekunden.</p>
          <p class="scope">Scope: <code>gist</code> · nur deine eigenen Gists lesen/schreiben. Kein Repo-Zugriff, kein User-Profil-Write.</p>
        </div>

        <div v-else-if="auth.phase.value === 'success'" class="dlg-body success">
          <IconCheck class="big-icon" />
          <p>Angemeldet! Dein State wird in einem privaten Gist synchronisiert.</p>
        </div>

        <div v-else-if="auth.phase.value === 'error'" class="dlg-body error">
          <IconWarning class="big-icon" />
          <p>{{ auth.errorMessage.value ?? 'Etwas ist schiefgelaufen.' }}</p>
          <button type="button" class="primary" @click="start">Erneut versuchen</button>
        </div>
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
  padding-top: 14vh;
  z-index: 110;
}
.dlg {
  width: min(440px, 92vw);
  background: white;
  border-radius: 18px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.45);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--c-hair);
}
.dlg-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--c-hair);
}
.dlg-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  flex: 1;
  color: var(--c-ink);
}
.dlg-head :deep(svg) { width: 18px; height: 18px; color: var(--c-ink); }
.close {
  background: transparent;
  border: 0;
  font-size: 14px;
  color: var(--c-mute);
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  transition: background 0.15s ease;
}
.close:hover { background: rgba(15, 23, 42, 0.05); color: var(--c-ink); }

.dlg-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 14px;
  color: var(--c-mute);
  line-height: 1.5;
}
.lead { margin: 0; }
.lead strong { color: var(--c-ink); font-weight: 600; }

.code-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid var(--c-hair);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.code-box:hover { background: rgba(15, 23, 42, 0.07); border-color: rgba(15, 23, 42, 0.14); }
.code {
  font-family: var(--font-mono);
  font-size: 32px;
  letter-spacing: 0.1em;
  font-weight: 600;
  color: var(--c-ink);
}
.code-hint {
  font-size: 11px;
  color: var(--c-mute-soft);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  background: var(--c-ink);
  color: white;
  border: 0;
  border-radius: var(--r-input);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), background 0.18s ease;
}
.primary:hover { transform: translateY(-1px); background: #1e293b; }
.primary :deep(svg) { width: 16px; height: 16px; }

.meta { margin: 0; font-size: 12.5px; color: var(--c-mute); }
.scope { margin: 0; font-size: 11.5px; color: var(--c-mute-soft); }
.scope code {
  font-family: var(--font-mono);
  background: rgba(15, 23, 42, 0.05);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10.5px;
}

.success, .error { text-align: center; align-items: center; }
.big-icon :deep(svg) { width: 36px; height: 36px; }
.success .big-icon { color: var(--c-pace-ahead); }
.error .big-icon { color: var(--c-pace-behind); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
