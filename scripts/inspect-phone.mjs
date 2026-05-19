// Connect to the live Chrome tab on the user's phone via DevTools protocol,
// dump console messages + page errors + the active SW state.
import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const contexts = browser.contexts()
  let page = null
  for (const ctx of contexts) {
    for (const p of ctx.pages()) {
      const url = p.url()
      if (url.includes('shroomlife.github.io/claude-week-burn')) {
        page = p
        break
      }
    }
    if (page) break
  }
  if (!page) {
    console.error('No tab open on shroomlife.github.io/claude-week-burn')
    process.exit(1)
  }
  console.log('Connected to tab:', page.url())

  // Last 30 console messages (Playwright doesn't replay history, but we can
  // grab the current DOM state + the SW state).
  const dom = await page.evaluate(() => {
    return {
      title: document.title,
      bodyHTML: document.body ? document.body.innerHTML.slice(0, 500) : '(no body)',
      hasAppDiv: Boolean(document.getElementById('app')),
      appInnerLen: document.getElementById('app')?.innerHTML?.length ?? 0,
      readyState: document.readyState,
    }
  })
  console.log('\n=== DOM state ===')
  console.log(JSON.stringify(dom, null, 2))

  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { hasSW: false }
    const regs = await navigator.serviceWorker.getRegistrations()
    return {
      hasSW: true,
      controller: navigator.serviceWorker.controller ? {
        scriptURL: navigator.serviceWorker.controller.scriptURL,
        state: navigator.serviceWorker.controller.state,
      } : null,
      registrations: regs.map((r) => ({
        scope: r.scope,
        active: r.active ? { url: r.active.scriptURL, state: r.active.state } : null,
        waiting: r.waiting ? { url: r.waiting.scriptURL, state: r.waiting.state } : null,
        installing: r.installing ? { url: r.installing.scriptURL, state: r.installing.state } : null,
      })),
    }
  })
  console.log('\n=== Service Worker state ===')
  console.log(JSON.stringify(swState, null, 2))

  // Take a screenshot for visual proof
  try {
    await page.screenshot({ path: 'screenshots/phone-debug.png', fullPage: false })
    console.log('\n📷 screenshots/phone-debug.png')
  } catch (e) { console.log('screenshot failed:', e.message) }

  // Listen for a moment for any errors / console activity
  console.log('\n=== Listening 5s for console output ===')
  page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text()))
  page.on('pageerror', (err) => console.log('[pageerror]', err.message))

  // Try to evaluate the loaded module count via window
  await page.waitForTimeout(5000)

  console.log('\n=== Done. Not closing browser (it is the phone) ===')
}

main().catch((err) => { console.error(err); process.exit(1) })
