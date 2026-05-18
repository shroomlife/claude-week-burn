<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showRefresh = ref(false)
const showReady = ref(false)
let updateSW: ((reload?: boolean) => Promise<void>) | null = null

onMounted(async () => {
  try {
    const { registerSW } = await import('virtual:pwa-register')
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => { showRefresh.value = true },
      onOfflineReady: () => {
        showReady.value = true
        window.setTimeout(() => { showReady.value = false }, 3000)
      },
    })
  } catch {
    // PWA virtual module is not available in dev — silently ignore.
  }
})

async function reload(): Promise<void> {
  if (updateSW) await updateSW(true)
}
</script>

<template>
  <div class="sw-area" aria-live="polite">
    <transition name="slide">
      <div v-if="showRefresh" class="sw-toast">
        <span>Neue Version verfügbar ✨</span>
        <button type="button" @click="reload">Reload</button>
      </div>
    </transition>
    <transition name="slide">
      <div v-if="showReady" class="sw-toast soft">
        <span>Offline-Modus bereit 🪐</span>
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
.sw-toast.soft {
  background: linear-gradient(135deg, #22d3ee, #0891b2);
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
