import { createApp } from 'vue'

import '@fontsource-variable/outfit/index.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'

import './styles/reset.css'
import './styles/tokens.css'
import './styles/base.css'

import App from './App.vue'
import { i18n } from './i18n'

createApp(App).use(i18n).mount('#app')

// Disarm the self-healing recovery from index.html / public/recovery.js.
// Mount happened, the bundle is live — no need to purge SW + caches.
// Done synchronously right after mount() returns so even a render error
// in App.vue still counts as "bundle reached this line".
const bootWindow = window as Window & { __bootOk?: boolean; __bootDeadline?: ReturnType<typeof setTimeout> }
bootWindow.__bootOk = true
if (bootWindow.__bootDeadline !== undefined) {
  clearTimeout(bootWindow.__bootDeadline)
}
// Reset the circuit-breaker counter so the next failure (if any) gets a
// fresh budget. The key matches RECOVERY_COUNTER_KEY in public/recovery.js.
try { sessionStorage.removeItem('burnRate:recovery:count') } catch { /* storage may be restricted */ }

// The boot skeleton (declared inline in index.html) is dismissed by
// App.vue once the app is actually ready — see `markBootReady()` there.
// We don't dismiss it from main.ts because then it'd flash away before
// the initial sync finishes, leaving the user staring at the
// half-loading state. App.vue knows when sync is done.
