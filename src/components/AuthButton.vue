<script setup lang="ts">
import { computed } from 'vue'
import IconGithub from '~icons/ph/github-logo'
import IconCloud from '~icons/ph/cloud-check'
import IconCloudWarn from '~icons/ph/cloud-warning'
import IconSyncing from '~icons/ph/arrows-clockwise'
import { useGitHubAuth } from '../composables/useGitHubAuth'
import { useGistSync } from '../composables/useGistSync'

const emit = defineEmits<{ (e: 'open-menu'): void }>()

const auth = useGitHubAuth()
const sync = useGistSync()

function signIn(): void {
  void auth.startLogin()
}

const statusIcon = computed(() => {
  switch (sync.status.value) {
    case 'syncing': return IconSyncing
    case 'error': return IconCloudWarn
    case 'idle': return IconCloud
    default: return IconCloud
  }
})

const statusTitle = computed(() => {
  if (sync.status.value === 'syncing') return 'Synchronisiere…'
  if (sync.status.value === 'error') return sync.errorMessage.value ?? 'Sync-Fehler'
  if (sync.lastSyncedAt.value) {
    return `Letzter Sync: ${new Date(sync.lastSyncedAt.value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }
  return 'Synced'
})
</script>

<template>
  <button
    v-if="!auth.isAuthenticated.value"
    class="auth-pill auth-signin"
    type="button"
    :disabled="auth.phase.value === 'redirecting' || auth.phase.value === 'exchanging'"
    @click="signIn"
    aria-label="Mit GitHub anmelden"
  >
    <IconGithub />
    <span>{{ auth.phase.value === 'exchanging' ? 'Logge ein…' : 'Sign in' }}</span>
  </button>

  <button
    v-else
    class="auth-pill auth-user"
    type="button"
    :title="statusTitle"
    :data-status="sync.status.value"
    @click="emit('open-menu')"
  >
    <img v-if="auth.user.value" :src="auth.user.value.avatar_url" :alt="auth.user.value.login" class="avatar" />
    <span class="login">{{ auth.user.value && auth.user.value.login }}</span>
    <span class="status-ind" :class="`status-${sync.status.value}`">
      <component :is="statusIcon" />
    </span>
  </button>
</template>

<style scoped>
.auth-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 6px;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-pill);
  font-size: 12px;
  color: var(--c-ink);
  font-weight: 500;
  transition: background 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
  cursor: pointer;
  letter-spacing: -0.005em;
}
.auth-pill:hover { background: rgba(15, 23, 42, 0.03); transform: translateY(-1px); }

.auth-signin {
  padding: 6px 12px;
  gap: 6px;
}
.auth-signin :deep(svg) { width: 14px; height: 14px; color: var(--c-ink); }

.avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--c-hair);
}
.login {
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: -0.02em;
  color: var(--c-ink);
}

.status-ind {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-ind :deep(svg) { width: 12px; height: 12px; }
.status-idle    { color: var(--c-pace-ahead); }
.status-syncing { color: var(--c-flame-2); animation: spin 1.4s linear infinite; }
.status-error   { color: var(--c-pace-behind); }
.status-off     { color: var(--c-line); }

@keyframes spin {
  to { transform: rotate(360deg); }
}

:global(body.is-hidden) .status-syncing { animation-play-state: paused; }

@media (max-width: 560px) {
  .login { max-width: 80px; }
}
</style>
