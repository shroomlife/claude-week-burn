// Minimal CDP probe — no playwright. Uses Node's built-in WebSocket
// (available since Node 22) to connect to the open Chrome tab on the
// phone, evaluate a small payload, dump result, exit hard.

const TAB_URL_INCLUDES = 'shroomlife.github.io/claude-week-burn'

async function getTab() {
  const res = await fetch('http://localhost:9222/json')
  const tabs = await res.json()
  return tabs.find((t) => (t.url || '').includes(TAB_URL_INCLUDES))
}

function send(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (event) => {
      const data = event.data ?? event
      const msg = JSON.parse(typeof data === 'string' ? data : data.toString())
      if (msg.id === id) {
        ws.removeEventListener('message', onMsg)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function main() {
  const tab = await getTab()
  if (!tab) { console.error('No matching tab open'); process.exit(1) }
  console.log('Tab URL:', tab.url)

  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  // Evaluate page state
  const r1 = await send(ws, 1, 'Runtime.evaluate', {
    expression: `JSON.stringify({
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      bodyChars: document.body ? document.body.textContent.length : 0,
      appHTML: document.getElementById('app') ? document.getElementById('app').innerHTML.length : 0,
      build: window.__BUILD_SHA__ || 'unset',
      swController: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null,
    })`,
    returnByValue: true,
  })
  console.log('\n=== Page state ===')
  console.log(r1.result?.value)

  // SW registrations
  const r2 = await send(ws, 2, 'Runtime.evaluate', {
    expression: `navigator.serviceWorker.getRegistrations().then(rs =>
      JSON.stringify(rs.map(r => ({
        scope: r.scope,
        active: r.active && { url: r.active.scriptURL, state: r.active.state },
        waiting: r.waiting && { url: r.waiting.scriptURL, state: r.waiting.state },
        installing: r.installing && { url: r.installing.scriptURL, state: r.installing.state },
      })))
    )`,
    awaitPromise: true,
    returnByValue: true,
  })
  console.log('\n=== SW registrations ===')
  console.log(r2.result?.value)

  // Recent console messages (last 10 stored on a temp hook)
  const r3 = await send(ws, 3, 'Runtime.evaluate', {
    expression: `(function() {
      const errors = []
      const origErr = window.onerror
      window.onerror = function(msg) { errors.push(String(msg)); if (origErr) return origErr.apply(this, arguments) }
      return { unhandledRejection: !!window.onunhandledrejection, prior: errors }
    })()`,
    returnByValue: true,
  })
  console.log('\n=== Error hooks ===')
  console.log(JSON.stringify(r3.result?.value, null, 2))

  // Try to fetch the JS asset URL from the page to see if it's reachable
  const r4 = await send(ws, 4, 'Runtime.evaluate', {
    expression: `(async () => {
      const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
      const results = []
      for (const url of scripts) {
        try {
          const r = await fetch(url, { method: 'HEAD' })
          results.push({ url, status: r.status, ok: r.ok })
        } catch (e) { results.push({ url, error: String(e) }) }
      }
      return JSON.stringify(results)
    })()`,
    awaitPromise: true,
    returnByValue: true,
  })
  console.log('\n=== Script fetch HEAD checks ===')
  console.log(r4.result?.value)

  ws.close()
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
