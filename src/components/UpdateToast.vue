<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const showRefresh = ref(false)
let updateSW: ((reload?: boolean) => Promise<void>) | null = null
let pollTimer: number | null = null

// Re-check for SW updates every 30 min while the tab is open. The browser
// only checks on navigation by default, so a long-lived PWA tab can miss a
// deploy until manually reloaded. This nudges it.
const UPDATE_POLL_MS = 30 * 60 * 1000

async function checkForUpdate(): Promise<void> {
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
      onRegisteredSW: (_url, registration) => {
        if (!registration) return
        pollTimer = window.setInterval(() => {
          void registration.update()
        }, UPDATE_POLL_MS)
      },
    })
  } catch {
    // dev / unsupported — virtual module isn't there, nothing to register.
  }
})

onBeforeUnmount(() => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

async function reload(): Promise<void> {
  if (updateSW) {
    // updateSW(true) sends SKIP_WAITING + reloads when controllerchange fires.
    await updateSW(true)
  } else {
    // Fallback if registration failed: force-reload the page.
    window.location.reload()
  }
}

// Expose a manual recheck for the command palette / debug.
defineExpose({ checkForUpdate })
</script>

<template>
  <div class="sw-area" aria-live="polite">
    <transition name="slide">
      <div v-if="showRefresh" class="sw-toast">
        <span>Neue Version verfügbar ✨</span>
        <button type="button" @click="reload">Reload</button>
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
  gap: 14px;
  padding: 11px 14px 11px 18px;
  border-radius: var(--r-pill);
  background: rgba(15, 23, 42, 0.92);
  color: white;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 16px 40px -16px rgba(15, 23, 42, 0.5);
}
.sw-toast button {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: var(--r-pill);
  background: white;
  color: #0f172a;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring);
}
.sw-toast button:hover { transform: translateY(-1px); }

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
