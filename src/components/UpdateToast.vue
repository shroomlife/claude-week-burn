<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEventListener } from '@vueuse/core'

const showRefresh = ref(false)
let updateSW: ((reload?: boolean) => Promise<void>) | null = null
let pollTimer: number | null = null
let registration: ServiceWorkerRegistration | null = null

// Background poll every 30 min for long-lived PWAs. On top of that we also
// check on visibility-resume + online — those cover the realistic "user
// switched tab to ours / came back from a flaky network" cases without
// burning network when the tab is idle.
const UPDATE_POLL_MS = 30 * 60 * 1000

async function checkForUpdate(): Promise<void> {
  if (registration) {
    try { await registration.update() } catch { /* harmless */ }
    return
  }
  // Fallback if the registration ref isn't populated yet.
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.update()))
  } catch { /* network may be down — harmless */ }
}

onMounted(async () => {
  // Log the running build so we can confirm what's actually live in the tab.
  // Read from injected build constants via vite `define`. Defensive try/catch
  // in case they are missing (e.g. in tests).
  try {
    const sha = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'unknown'
    const time = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'unknown'
    console.info(`%c[burn-rate] build ${sha} · ${time}`, 'color:#ea580c;font-weight:600;')
  } catch { /* noop */ }

  try {
    const { registerSW } = await import('virtual:pwa-register')
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        console.info('[burn-rate] new version available — waiting for user reload')
        showRefresh.value = true
      },
      onRegisteredSW: (_url, reg) => {
        if (!reg) return
        registration = reg
        pollTimer = window.setInterval(() => {
          void reg.update()
        }, UPDATE_POLL_MS)
      },
    })
  } catch {
    // dev / unsupported — virtual module isn't there, nothing to register.
  }
})

// Extra update triggers — more reliable than just the background poll.
useEventListener(document, 'visibilitychange', () => {
  if (!document.hidden) void checkForUpdate()
})
useEventListener(window, 'online', () => { void checkForUpdate() })
useEventListener(window, 'focus', () => { void checkForUpdate() })

onBeforeUnmount(() => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

const reloading = ref(false)

async function reload(): Promise<void> {
  if (reloading.value) return
  reloading.value = true
  console.info('[burn-rate] reload clicked — full SW nuke + hard reload')

  // BULLETPROOF reload strategy. Earlier attempts coordinated SKIP_WAITING
  // + controllerchange + a failsafe timer, but the user kept landing on a
  // blank page because:
  //   - With clientsClaim:false, controllerchange never fires for the
  //     current tab. The failsafe eventually triggered, but during the
  //     gap the old SW served stale chunks from a half-cleaned cache
  //     after the new SW's activate() ran cleanupOutdatedCaches.
  //   - With clientsClaim:true, the new SW grabs the tab mid-flight and
  //     the in-memory JS doesn't match the freshly-served HTML.
  //
  // The reliable fix: don't try to swap SWs in place. Unregister every
  // SW, delete every cache, then hard-reload. The next navigation goes
  // straight to network (no SW interception), pulls the new HTML + JS
  // fresh, and a new SW registers cleanly on the new page. Costs an
  // extra few hundred KB of fetches once per update — worth it for a
  // 'click button = see new version' guarantee.
  //
  // The 8s failsafe wraps the SW/cache cleanup in case it hangs on a
  // weird permission edge — we hard-reload anyway and the worst case
  // is the next page still has SW remnants, but at least it loads.
  const failsafe = window.setTimeout(() => {
    console.warn('[burn-rate] SW cleanup timed out — forcing reload')
    window.location.reload()
  }, 8000)

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
    }
  } catch (err) {
    console.warn('[burn-rate] SW/cache cleanup partial failure', err)
  }

  clearTimeout(failsafe)
  window.location.reload()
}

// Expose a manual recheck for the command palette / debug.
defineExpose({ checkForUpdate })
</script>

<template>
  <div class="sw-area" aria-live="polite">
    <transition name="slide">
      <div v-if="showRefresh" class="sw-toast" :class="{ updating: reloading }">
        <span v-if="reloading" class="spinner" aria-hidden="true" />
        <span class="msg">{{ reloading ? $t('toast.updating') : $t('toast.updateAvailable') }}</span>
        <button
          type="button"
          class="reload-btn"
          :disabled="reloading"
          @click="reload"
        >
          {{ reloading ? '…' : $t('toast.reload') }}
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.sw-area {
  position: fixed;
  top: 16px;
  right: 16px;
  /* Above modals (110) — update toast must stay visible while any dialog
     is open. Otherwise the backdrop blurs it and the user can't act on it. */
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sw-toast {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px 11px 18px;
  border-radius: var(--r-pill);
  background: rgba(15, 23, 42, 0.92);
  color: white;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 16px 40px -16px rgba(15, 23, 42, 0.5);
  transition: background 0.2s ease;
}
.sw-toast.updating {
  background: linear-gradient(135deg, #ea580c, #c2410c);
}
.sw-toast .msg { letter-spacing: -0.005em; }

.sw-toast .reload-btn {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: var(--r-pill);
  background: white;
  color: #0f172a;
  cursor: pointer;
  border: 0;
  transition: transform 0.15s var(--ease-spring), opacity 0.15s ease;
  min-width: 56px;
}
.sw-toast .reload-btn:hover:not(:disabled) { transform: translateY(-1px); }
.sw-toast .reload-btn:disabled {
  cursor: progress;
  opacity: 0.6;
}

/* Spinner — small inline ring next to the message. */
.sw-toast .spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  animation: sw-spin 0.9s linear infinite;
  flex-shrink: 0;
}
@keyframes sw-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .sw-toast .spinner { animation: none; border-top-color: rgba(255, 255, 255, 0.6); }
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.22s ease, transform 0.32s var(--ease-spring);
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
