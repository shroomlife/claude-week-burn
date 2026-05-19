<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconGithub from '~icons/ph/github-logo'
import IconCloud from '~icons/ph/cloud-check'
import IconCloudWarn from '~icons/ph/cloud-warning'
import IconSyncing from '~icons/ph/arrows-clockwise'
import { useGitHubAuth } from '../composables/useGitHubAuth'
import { useGistSync } from '../composables/useGistSync'

const emit = defineEmits<{
  (e: 'open-menu'): void
  (e: 'open-account'): void
}>()

const { t, locale } = useI18n()
const auth = useGitHubAuth()
const sync = useGistSync()

function signIn(): void {
  void auth.startLogin()
}

const isBusy = computed(() =>
  sync.status.value === 'bootstrapping' ||
  sync.status.value === 'pulling' ||
  sync.status.value === 'pushing',
)

const statusIcon = computed(() => {
  if (isBusy.value) return IconSyncing
  if (sync.status.value === 'error') return IconCloudWarn
  return IconCloud
})

const statusTitle = computed(() => {
  const s = sync.status.value
  if (s === 'bootstrapping') return t('auth.tooltip.bootstrapping')
  if (s === 'pulling') return t('auth.tooltip.pulling')
  if (s === 'pushing') return t('auth.tooltip.pushing')
  if (s === 'error') return sync.errorMessage.value ?? t('auth.tooltip.error')
  if (sync.isDirty.value) return t('auth.tooltip.dirty')
  if (sync.lastSyncedAt.value) {
    const time = new Date(sync.lastSyncedAt.value).toLocaleTimeString(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
    })
    return t('auth.tooltip.lastSync', { time })
  }
  return t('auth.tooltip.synced')
})
</script>

<template>
  <button
    v-if="!auth.isAuthenticated.value"
    class="auth-pill auth-signin"
    type="button"
    :disabled="auth.phase.value === 'redirecting' || auth.phase.value === 'exchanging'"
    :aria-label="$t('auth.ariaSignIn')"
    @click="signIn"
  >
    <IconGithub />
    <span>{{ auth.phase.value === 'exchanging' ? $t('auth.signingIn') : $t('auth.signIn') }}</span>
  </button>

  <button
    v-else
    class="auth-pill auth-user"
    type="button"
    :title="statusTitle"
    :data-status="sync.status.value"
    @click="emit('open-account')"
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
.status-idle          { color: var(--c-pace-ahead); }
.status-bootstrapping,
.status-pulling,
.status-pushing       { color: var(--c-flame-2); animation: spin 1.4s linear infinite; }
.status-error         { color: var(--c-pace-behind); }
.status-off           { color: var(--c-line); }

@keyframes spin {
  to { transform: rotate(360deg); }
}

:global(body.is-hidden) .status-pulling,
:global(body.is-hidden) .status-pushing,
:global(body.is-hidden) .status-bootstrapping { animation-play-state: paused; }

@media (max-width: 560px) {
  .login { max-width: 80px; }
}
</style>
