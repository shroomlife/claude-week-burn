<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconClose from '~icons/ph/x-bold'
import IconGithub from '~icons/ph/github-logo'
import IconCloudCheck from '~icons/ph/cloud-check'
import IconCloudWarn from '~icons/ph/cloud-warning'
import IconSyncing from '~icons/ph/arrows-clockwise'
import IconSignout from '~icons/ph/sign-out'
import IconCloudUp from '~icons/ph/cloud-arrow-up'
import IconExternal from '~icons/ph/arrow-square-out'
import { useGitHubAuth } from '../composables/useGitHubAuth'
import { useGistSync } from '../composables/useGistSync'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'logout'): void
  (e: 'sync-now'): void
}>()

const { t, locale } = useI18n()
const auth = useGitHubAuth()
const sync = useGistSync()

const isBusy = computed(() =>
  sync.status.value === 'bootstrapping' ||
  sync.status.value === 'pulling' ||
  sync.status.value === 'pushing',
)

const statusIcon = computed(() => {
  if (isBusy.value) return IconSyncing
  if (sync.status.value === 'error') return IconCloudWarn
  return IconCloudCheck
})

const statusLabel = computed(() => t(`account.status.${sync.status.value}`))

const statusTone = computed(() => {
  if (sync.status.value === 'error') return 'error'
  if (isBusy.value) return 'busy'
  if (sync.status.value === 'idle') return 'ok'
  return 'off'
})

const lastSyncedLabel = computed(() => {
  if (!sync.lastSyncedAt.value) return t('account.lastSyncNever')
  const d = new Date(sync.lastSyncedAt.value)
  return d.toLocaleString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const gistUrl = computed(() => {
  if (!sync.gistId.value || !auth.user.value) return null
  return `https://gist.github.com/${auth.user.value.login}/${sync.gistId.value}`
})

function close(): void { emit('close') }
function doLogout(): void {
  emit('logout')
  emit('close')
}
function doSyncNow(): void {
  emit('sync-now')
}

// ESC closes
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

watch(() => props.open, (open) => {
  if (open) {
    document.addEventListener('keydown', onKey)
  } else {
    document.removeEventListener('keydown', onKey)
  }
})
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="close">
      <transition name="card">
        <div v-if="open" class="dlg" role="dialog" aria-modal="true" aria-labelledby="acc-dlg-title">
          <header class="dlg-head">
            <h2 id="acc-dlg-title">{{ $t('account.title') }}</h2>
            <button type="button" class="close" :aria-label="$t('account.close')" @click="close">
              <IconClose />
            </button>
          </header>

          <!-- Hero: avatar + login -->
          <div class="hero">
            <div class="avatar-wrap">
              <img
                v-if="auth.user.value"
                :src="auth.user.value.avatar_url"
                :alt="auth.user.value.login"
                class="avatar"
              />
              <div v-else class="avatar avatar-placeholder">
                <IconGithub />
              </div>
              <span class="status-badge" :data-tone="statusTone" aria-hidden="true">
                <component :is="statusIcon" />
              </span>
            </div>
            <div class="who">
              <span class="eyebrow">{{ $t('account.connectedAs') }}</span>
              <span class="login">@{{ auth.user.value?.login ?? '…' }}</span>
              <span class="status-line" :data-tone="statusTone">{{ statusLabel }}</span>
            </div>
          </div>

          <!-- Sync info rows -->
          <dl class="info">
            <div class="info-row">
              <dt>{{ $t('account.lastSync') }}</dt>
              <dd class="num">{{ lastSyncedLabel }}</dd>
            </div>
            <div v-if="sync.isDirty.value" class="info-row info-row-soft">
              <dt>{{ $t('auth.tooltip.dirty') }}</dt>
              <dd class="dot-pulse" aria-hidden="true">
                <span /><span /><span />
              </dd>
            </div>
          </dl>

          <!-- Links: profile + gist -->
          <div class="links">
            <a
              v-if="auth.user.value"
              :href="auth.user.value.html_url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-row"
            >
              <IconGithub class="link-icon" />
              <span class="link-label">{{ $t('account.profileLink') }}</span>
              <IconExternal class="link-ext" />
            </a>
            <a
              v-if="gistUrl"
              :href="gistUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="link-row"
            >
              <IconCloudCheck class="link-icon" />
              <span class="link-label">{{ $t('account.gistLink') }}</span>
              <IconExternal class="link-ext" />
            </a>
          </div>

          <!-- Actions -->
          <footer class="dlg-foot">
            <button
              type="button"
              class="btn ghost"
              :disabled="isBusy || !sync.initialPullDone.value"
              @click="doSyncNow"
            >
              <IconCloudUp />
              <span>{{ $t('account.syncNow') }}</span>
            </button>
            <button type="button" class="btn danger" @click="doLogout">
              <IconSignout />
              <span>{{ $t('account.logout') }}</span>
            </button>
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
  padding: 10vh 16px 16px;
  z-index: 110;
}
.dlg {
  width: min(440px, 100%);
  background: white;
  border-radius: 22px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.5);
  overflow: hidden;
  border: 1px solid var(--c-hair);
  display: flex;
  flex-direction: column;
}

.dlg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--c-hair);
}
.dlg-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
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

/* ===== Hero ===== */
.hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 22px 18px;
}
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 8px 24px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05);
  display: block;
}
.avatar-placeholder {
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.06);
  color: var(--c-mute);
}
.avatar-placeholder :deep(svg) { width: 36px; height: 36px; }

.status-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: white;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px white, 0 4px 12px -4px rgba(15, 23, 42, 0.18);
  color: var(--c-pace-ahead);
  transition: color 0.18s ease;
}
.status-badge :deep(svg) { width: 14px; height: 14px; }
.status-badge[data-tone='busy'] {
  color: var(--c-flame-2);
  animation: spin 1.4s linear infinite;
}
.status-badge[data-tone='error']  { color: var(--c-pace-behind); }
.status-badge[data-tone='off']    { color: var(--c-line); }

@keyframes spin {
  to { transform: rotate(360deg); }
}

.who {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-mute-soft);
}
.login {
  font-family: var(--font-mono);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--c-ink);
  line-height: 1.15;
  word-break: break-all;
}
.status-line {
  font-size: 12px;
  font-weight: 500;
  color: var(--c-mute);
  letter-spacing: -0.005em;
  margin-top: 2px;
}
.status-line[data-tone='ok']    { color: var(--c-pace-ahead); }
.status-line[data-tone='busy']  { color: var(--c-flame-2); }
.status-line[data-tone='error'] { color: var(--c-pace-behind); }

/* ===== Info dl ===== */
.info {
  margin: 0 22px;
  padding: 0;
  border-radius: var(--r-card-sm);
  border: 1px solid var(--c-hair);
  background: rgba(15, 23, 42, 0.025);
  overflow: hidden;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--c-hair);
}
.info-row:last-child { border-bottom: 0; }
.info-row dt {
  font-size: 12px;
  font-weight: 500;
  color: var(--c-mute);
  margin: 0;
  letter-spacing: -0.003em;
}
.info-row dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--c-ink);
  letter-spacing: -0.02em;
}
.info-row-soft {
  background: rgba(234, 88, 12, 0.04);
}

.dot-pulse {
  display: inline-flex;
  gap: 4px;
}
.dot-pulse span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-flame-2);
  animation: dot-pulse 1.2s ease-in-out infinite;
}
.dot-pulse span:nth-child(2) { animation-delay: 0.18s; }
.dot-pulse span:nth-child(3) { animation-delay: 0.36s; }
@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}

/* ===== Links ===== */
.links {
  margin: 14px 22px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.link-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
  text-decoration: none;
  color: var(--c-ink);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.link-row:hover {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}
.link-icon { width: 18px; height: 18px; color: var(--c-mute); flex-shrink: 0; }
.link-row:hover .link-icon { color: var(--c-flame-2); }
.link-label {
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.link-ext { width: 14px; height: 14px; color: var(--c-mute-soft); flex-shrink: 0; }

/* ===== Footer / Actions ===== */
.dlg-foot {
  display: flex;
  gap: 8px;
  padding: 16px 22px 20px;
  margin-top: 18px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--r-input);
  border: 1px solid transparent;
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  flex: 1;
}
.btn :deep(svg) { width: 15px; height: 15px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn.ghost {
  background: transparent;
  color: var(--c-ink-soft);
  border-color: var(--c-hair);
}
.btn.ghost:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.04);
  color: var(--c-ink);
  transform: translateY(-1px);
}
.btn.danger {
  background: var(--c-pace-behind);
  color: white;
}
.btn.danger:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

/* ===== Transitions ===== */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.card-enter-active {
  transition: opacity 0.22s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.card-leave-active {
  transition: opacity 0.18s ease, transform 0.22s ease;
}
.card-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.985);
}
.card-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .status-badge[data-tone='busy'] { animation: none; }
  .dot-pulse span { animation: none; opacity: 0.6; }
  .card-enter-active, .card-leave-active { transition: opacity 0.2s ease; }
  .card-enter-from, .card-leave-to { transform: none; }
}

@media (max-width: 480px) {
  .dlg-backdrop { padding: 8vh 12px 12px; }
  .hero { padding: 18px 18px 14px; gap: 14px; }
  .avatar { width: 64px; height: 64px; }
  .login { font-size: 17px; }
  .info { margin: 0 18px; }
  .links { margin: 12px 18px 0; }
  .dlg-foot { padding: 14px 18px 16px; margin-top: 14px; flex-direction: column; }
  .btn { flex: none; width: 100%; }
}
</style>
