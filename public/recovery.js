/*
 * Boot deadline + self-healing recovery.
 *
 * Last line of defense against a stale Service Worker precache that points
 * at an asset hash GitHub Pages no longer serves (recurring white-screen
 * symptom in standalone PWAs). If the Vue bundle doesn't disarm us within
 * BOOT_DEADLINE_MS, OR if the entry script load fails outright, we
 * unregister every SW for this scope, delete every Workbox cache, and hard
 * reload. The next navigation hits the network for a fresh sw.js + fresh
 * precache + fresh JS.
 *
 * Loaded synchronously from <head> before the module bundle, so it always
 * runs first — even when the bundle 404s. CSP-clean: external `self`-origin
 * script, works with `script-src 'self'` and no inline.
 *
 * Circuit-breaker: tracks attempts in sessionStorage so we never re-enter a
 * reload loop. After RECOVERY_MAX attempts in a single tab session, we
 * surface a minimal inline error UI instead of reloading again — same-tab,
 * accessible, German-localized, no dependencies. Lets the user see *some*
 * feedback when the root cause is upstream (GH Pages outage, real network
 * outage) rather than a stale cache.
 */
(() => {
  'use strict'

  const BOOT_DEADLINE_MS = 6000
  const PURGE_HARD_CAP_MS = 3000
  const RECOVERY_COUNTER_KEY = 'burnRate:recovery:count'
  const RECOVERY_MAX = 2

  /** @type {(reason: string) => void} */
  const purgeAndReload = (reason) => {
    try { console.warn(`[recovery] firing — ${reason}`) } catch { /* console can fail under privacy modes */ }

    // Circuit-breaker: bail out if we've already reloaded twice this session.
    // A third attempt almost certainly means the upstream (network, GH Pages,
    // or a deeper bug) is the problem, not a stale cache — looping won't help.
    let count = 0
    try {
      const raw = sessionStorage.getItem(RECOVERY_COUNTER_KEY)
      count = raw === null ? 0 : Number.parseInt(raw, 10)
      if (!Number.isFinite(count) || count < 0) count = 0
    } catch { /* storage may be partitioned/disabled */ }

    if (count >= RECOVERY_MAX) {
      try { sessionStorage.removeItem(RECOVERY_COUNTER_KEY) } catch { /* noop */ }
      renderFatal(reason)
      return
    }

    try { sessionStorage.setItem(RECOVERY_COUNTER_KEY, String(count + 1)) } catch { /* noop */ }

    let done = false
    const finish = () => {
      if (done) return
      done = true
      try { window.location.reload() } catch { /* noop */ }
    }

    // Hard cap so a hung purge can't stall the recovery indefinitely.
    setTimeout(finish, PURGE_HARD_CAP_MS)

    Promise.resolve()
      .then(async () => {
        if (!('serviceWorker' in navigator)) return
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      })
      .catch(() => { /* permission / privacy mode — fall through */ })
      .then(async () => {
        if (!('caches' in window)) return
        const names = await caches.keys()
        await Promise.all(names.map((n) => caches.delete(n)))
      })
      .catch(() => { /* storage may be restricted */ })
      .then(finish)
  }

  /**
   * Minimal accessible fallback UI shown after the circuit-breaker trips.
   * Inline-styled (already permitted by `style-src 'self' 'unsafe-inline'`),
   * no external assets, no framework — must work even if literally every
   * other resource is unavailable. German because that's the primary locale.
   * @param {string} reason
   */
  const renderFatal = (reason) => {
    try { console.error(`[recovery] giving up — ${reason}`) } catch { /* noop */ }
    const append = () => {
      // Don't double-render if something else already painted.
      if (document.getElementById('recovery-fatal')) return
      const el = document.createElement('div')
      el.id = 'recovery-fatal'
      el.setAttribute('role', 'alert')
      el.setAttribute('aria-live', 'assertive')
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99999',
        'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
        'padding:24px', 'gap:14px',
        'background:#fcfcfd', 'color:#0a0e1a',
        'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
        'text-align:center', 'line-height:1.5',
      ].join(';')
      el.innerHTML = [
        '<div style="font-size:48px;line-height:1">⚠️</div>',
        '<h1 style="margin:0;font-size:20px;font-weight:600;letter-spacing:-0.01em">Burn Rate konnte nicht starten</h1>',
        '<p style="margin:0;max-width:420px;font-size:14px;color:#475569">Wir haben mehrfach versucht, die App frisch zu laden. Wahrscheinlich ist GitHub Pages gerade nicht erreichbar oder es gibt ein Netzwerk-Problem. Bitte später nochmal versuchen.</p>',
        '<button id="recovery-fatal-retry" type="button" style="margin-top:6px;padding:10px 18px;border:0;border-radius:999px;background:#0a0e1a;color:#fff;font:600 14px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer">Erneut versuchen</button>',
      ].join('')
      document.body.appendChild(el)
      const btn = document.getElementById('recovery-fatal-retry')
      if (btn) {
        btn.addEventListener('click', () => {
          try { sessionStorage.removeItem(RECOVERY_COUNTER_KEY) } catch { /* noop */ }
          window.location.reload()
        })
      }
    }
    if (document.body) {
      append()
    } else {
      document.addEventListener('DOMContentLoaded', append, { once: true })
    }
  }

  // Arm the boot deadline. Bundle disarms via window.__bootOk in main.ts.
  window.__bootDeadline = setTimeout(() => {
    if (window.__bootOk) return
    purgeAndReload(`boot deadline exceeded (${BOOT_DEADLINE_MS}ms)`)
  }, BOOT_DEADLINE_MS)

  // Belt + suspenders: a hard same-origin script load failure (404, network
  // error, parse error on the entry bundle) is a deterministic recovery
  // trigger — no need to wait the full deadline. Capture phase to see
  // resource errors that don't bubble.
  window.addEventListener('error', (e) => {
    if (window.__bootOk) return
    const target = e && e.target
    if (!target || target === window) return
    if (!(target instanceof HTMLScriptElement)) return
    const src = target.src || ''
    // Ignore script errors from sources we don't control (extensions etc.).
    if (src && src.indexOf(window.location.origin) !== 0) return
    clearTimeout(window.__bootDeadline)
    purgeAndReload(`entry script failed to load: ${src || 'inline'}`)
  }, true)

  // The recovery counter is cleared by main.ts on a clean boot
  // (sessionStorage.removeItem on the same key), so the next failure mode
  // gets a fresh budget. No polling needed.
})()
