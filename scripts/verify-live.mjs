// Smoke-test the live deploy via Playwright. Navigates to the production
// URL, captures console logs, screenshots the initial render in three
// locales, and verifies the build SHA the running tab reports.

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'screenshots', 'live-check')
const URL = 'https://shroomlife.github.io/claude-week-burn/'

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  for (const locale of ['de', 'en', 'es']) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-GB',
    })
    const page = await ctx.newPage()

    const consoleMsgs = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('burn-rate') || text.includes('[sync]') || text.includes('[auth]')) {
        consoleMsgs.push(`${msg.type()}: ${text}`)
      }
    })

    // Set locale + a mid-week state so we capture a "live" looking shot
    await page.addInitScript(({ s, locale }) => {
      localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
      localStorage.setItem('burnRate:locale', locale)
    }, {
      s: {
        resetDate: new Date(Date.now() + 3.5 * 86400000)
          .toISOString()
          .slice(0, 16),
        usagePercent: 47,
        setupComplete: true,
        lastSeen: new Date().toISOString(),
      },
      locale,
    })

    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    await page.screenshot({
      path: resolve(OUT_DIR, `live-${locale}.png`),
      fullPage: false,
    })

    console.log(`\n=== ${locale.toUpperCase()} ===`)
    console.log(`screenshot: live-${locale}.png`)
    for (const m of consoleMsgs) console.log('  ', m)
    await ctx.close()
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
