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
  console.info('[burn-rate] reload clicked — waiting for controllerchange…')

  // Guarantee exactly ONE reload. The earlier version awaited updateSW(true)
  // (which reloads internally) AND then called reload() again, racing two
  // navigations against each other — that's what was leaving the tab blank.
  //
  // New strategy:
  //   1. Subscribe to navigator.serviceWorker.controllerchange ONCE.
  //   2. Send SKIP_WAITING via updateSW(false) — false = don't reload itself.
  //   3. When the new SW takes control, controllerchange fires, we reload.
  //   4. A 5s failsafe hard-reloads if controllerchange never fires.
  //   5. A single `reloaded` flag short-circuits whichever fires second.
  let reloaded = false
  function doReload(): void {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.info('[burn-rate] controllerchange — reloading')
      doReload()
    }, { once: true })
  }

  // Failsafe: if neither updateSW nor controllerchange fires within 5s,
  // hard-reload anyway. 5s is enough for slow networks, short enough that
  // a stuck spinner doesn't feel broken.
  window.setTimeout(() => {
    if (!reloaded) {
      console.warn('[burn-rate] SW activation timed out — hard reloading')
      doReload()
    }
  }, 5000)

  if (!updateSW) {
    // virtual:pwa-register wasn't loaded (dev mode / unsupported) —
    // straight hard-reload.
    doReload()
    return
  }

  try {
    // false = do NOT reload internally. We own the reload via controllerchange.
    await updateSW(false)
    // updateSW(false) resolves after the new SW finishes activating. If we
    // already reloaded from the listener, this is a noop. If for some reason
    // no controllerchange fired (e.g. fresh install with no prior controller),
    // reload manually here.
    if (!reloaded) {
      console.info('[burn-rate] updateSW resolved without controllerchange — reloading')
      doReload()
    }
  } catch (err) {
    console.warn('[burn-rate] updateSW threw — hard reloading', err)
    doReload()
  }
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
  z-index: 60;
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
