<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCloudDown from '~icons/ph/cloud-arrow-down-fill'
import IconGithub from '~icons/ph/github-logo'
import IconWarn from '~icons/ph/warning-fill'
import type { GitHubUser } from '../composables/useGitHubAuth'

const props = defineProps<{
  phase: 'connecting' | 'fetching' | 'error'
  user: GitHubUser | null
  error: string | null
}>()

defineEmits<{ (e: 'retry'): void }>()

const { t } = useI18n()

const title = computed(() => t(`initialSync.title.${props.phase}`))

const subtitle = computed(() => {
  if (props.phase === 'error') return props.error ?? t('initialSync.subtitle.error')
  return t(`initialSync.subtitle.${props.phase}`)
})
</script>

<template>
  <section class="sync card" :class="`phase-${phase}`">
    <div class="hero">
      <div class="logo" aria-hidden="true">
        <component :is="phase === 'error' ? IconWarn : IconCloudDown" />
      </div>
      <div class="text">
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
    </div>

    <div class="status-row">
      <div v-if="user" class="user-pill">
        <img :src="user.avatar_url" :alt="user.login" class="avatar" />
        <span class="login">@{{ user.login }}</span>
      </div>
      <div v-else class="user-pill placeholder">
        <IconGithub class="github-icon" />
        <span class="login">github.com</span>
      </div>

      <div class="indicator" aria-hidden="true">
        <template v-if="phase === 'error'">
          <button type="button" class="retry" @click="$emit('retry')">{{ $t('initialSync.retry') }}</button>
        </template>
        <template v-else>
          <span class="dot" />
          <span class="dot" />
          <span class="dot" />
        </template>
      </div>
    </div>

    <div class="bar" aria-hidden="true">
      <div class="bar-fill" />
    </div>
  </section>
</template>

<style scoped>
.sync {
  display: grid;
  gap: 22px;
  padding: 28px 26px 22px;
}

.hero {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.logo {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  color: white;
  flex-shrink: 0;
  box-shadow: 0 12px 28px -12px rgba(234, 88, 12, 0.55);
  animation: logo-breathe 2.4s ease-in-out infinite;
}
.phase-error .logo {
  background: linear-gradient(135deg, #f43f5e, #be123c);
  box-shadow: 0 12px 28px -12px rgba(190, 18, 60, 0.55);
  animation: none;
}
.logo :deep(svg) { width: 28px; height: 28px; }

@keyframes logo-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

.text h1 {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--c-ink);
  margin: 0 0 4px;
}
.text p {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--c-mute);
  margin: 0;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.025);
  border-radius: var(--r-md, 12px);
  border: 1px solid var(--c-hair);
}

.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid white;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}
.github-icon {
  width: 22px;
  height: 22px;
  color: var(--c-ink);
  opacity: 0.7;
}
.user-pill .login {
  font-family: var(--font-mono);
  font-size: 12.5px;
  letter-spacing: -0.02em;
  color: var(--c-ink);
}
.user-pill.placeholder .login { opacity: 0.6; }

.indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-flame-2);
  display: inline-block;
  animation: dot-pulse 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }
@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}

.retry {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: var(--c-ink);
  color: white;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring), opacity 0.15s ease;
}
.retry:hover { transform: translateY(-1px); }

.bar {
  position: relative;
  height: 3px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  overflow: hidden;
}
.bar-fill {
  position: absolute;
  inset-block: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--c-flame-2), transparent);
  animation: bar-slide 1.6s ease-in-out infinite;
}
.phase-error .bar-fill { animation: none; opacity: 0; }
@keyframes bar-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

@media (prefers-reduced-motion: reduce) {
  .logo, .dot, .bar-fill { animation: none; }
}

@media (max-width: 560px) {
  .sync { padding: 22px 18px 18px; }
  .hero { gap: 12px; }
  .logo { width: 48px; height: 48px; }
  .logo :deep(svg) { width: 24px; height: 24px; }
  .text h1 { font-size: 17px; }
}
</style>
