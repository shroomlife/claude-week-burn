/*
 * Boot deadline + self-healing recovery.
 *
 * Last line of defense against a stale Service Worker precache that points
 * at an asset hash GitHub Pages no longer serves (recurring white-screen
 * report). If the Vue bundle doesn't disarm us within BOOT_DEADLINE_MS, we
 * unregister every SW for this scope and delete every Workbox cache, then
 * hard-reload. The next navigation hits the network for a fresh sw.js +
 * fresh precache + fresh JS — the same purge Robin's "bulletproof Reload"
 * button does (commit 77946ac), but automatic, so a white-screened PWA
 * heals itself without DevTools.
 *
 * Loaded synchronously from <head> before the module bundle, so it always
 * runs first — even when the bundle 404s. CSP-clean: external `self`-origin
 * script, no inline.
 */
(function () {
  var BOOT_DEADLINE_MS = 6000
  var PURGE_HARD_CAP_MS = 3000

  function purgeAndReload(reason) {
    try { console.warn('[recovery] firing — ' + reason) } catch (e) {}

    var done = false
    function finish() {
      if (done) return
      done = true
      try { window.location.reload() } catch (e) {}
    }

    // Hard cap so the purge itself can't stall the recovery indefinitely
    // (e.g. SW that won't release its registration promise).
    setTimeout(finish, PURGE_HARD_CAP_MS)

    Promise.resolve()
      .then(function () {
        if (!('serviceWorker' in navigator)) return null
        return navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister() }))
        })
      })
      .catch(function () { /* permission / privacy mode — fall through */ })
      .then(function () {
        if (!('caches' in window)) return null
        return caches.keys().then(function (names) {
          return Promise.all(names.map(function (n) { return caches.delete(n) }))
        })
      })
      .catch(function () { /* storage may be restricted */ })
      .then(finish)
  }

  window.__bootDeadline = setTimeout(function () {
    if (window.__bootOk) return
    purgeAndReload('boot deadline exceeded (' + BOOT_DEADLINE_MS + 'ms)')
  }, BOOT_DEADLINE_MS)

  // Belt + suspenders: a hard script load failure (404, network error,
  // parse error on the entry bundle) is a deterministic recovery trigger —
  // no need to wait the full deadline. Capture phase so we see resource
  // errors that don't bubble.
  window.addEventListener('error', function (e) {
    if (window.__bootOk) return
    var target = e && e.target
    if (!target || target === window) return
    if (target.tagName !== 'SCRIPT') return
    // Ignore script errors from sources we don't control (extensions etc.).
    var src = target.src || ''
    if (src && src.indexOf(window.location.origin) !== 0) return
    clearTimeout(window.__bootDeadline)
    purgeAndReload('entry script failed to load: ' + (src || 'inline'))
  }, true)
})()
