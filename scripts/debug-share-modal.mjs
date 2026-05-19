// Drive the live URL, open the share modal, capture console + page errors
// to confirm the broken image is a CSP blob: violation.

import { chromium } from 'playwright'

const URL = process.env.URL ?? 'https://shroomlife.github.io/claude-week-burn/'

function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'de-DE',
  })
  const page = await ctx.newPage()

  page.on('console', (msg) => {
    console.log(`[console.${msg.type()}]`, msg.text())
  })
  page.on('pageerror', (err) => {
    console.log('[pageerror]', err.message)
  })

  await page.addInitScript(({ s, locale }) => {
    localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
    localStorage.setItem('burnRate:locale', locale)
  }, {
    s: {
      resetDate: toLocalISO(new Date(Date.now() + 3 * 86400000 + 4 * 3600000)),
      usagePercent: 47,
      setupComplete: true,
      lastSeen: new Date().toISOString(),
    },
    locale: 'de',
  })

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Open command palette and trigger share
  await page.keyboard.press('Control+K')
  await page.waitForTimeout(400)
  await page.fill('input[type="text"]', 'share')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(3000)

  // Inspect the img element in the modal
  const result = await page.evaluate(() => {
    const img = document.querySelector('.preview')
    if (!img) return { found: false }
    return {
      found: true,
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      currentSrc: img.currentSrc,
    }
  })

  console.log('\n[preview-img]', JSON.stringify(result, null, 2))

  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
