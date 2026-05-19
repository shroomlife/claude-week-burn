<script setup lang="ts">
import { onMounted } from 'vue'

// Lightweight invisible component: registers the Service Worker on mount
// and logs the running build SHA + time to the console for debugging.
// No user-facing UI any more — with `registerType: 'autoUpdate'` + NetworkFirst
// runtime caching in vite.config.ts, new deploys land on the next reload
// silently. The earlier prompt-and-reload flow caused a "Neue Version"
// loop where each reload immediately surfaced a fresh "new version" toast.

onMounted(async () => {
  try {
    const sha = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'unknown'
    const time = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'unknown'
    console.info(
      `%c[burn-rate] build ${sha} · ${time}`,
      'color:#ea580c;font-weight:600;',
    )
  } catch { /* noop */ }

  try {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  } catch {
    // dev / unsupported — virtual module isn't there, nothing to register.
  }
})
</script>

<template>
  <!--
    Intentionally empty. SW registration is a side-effect of mount;
    there is no UI for updates because NetworkFirst handles freshness
    automatically on every reload.
  -->
</template>
