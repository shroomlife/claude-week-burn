// Marketing screenshots — boots the production preview server, sets app
// state via localStorage, captures four shots that show the app's range.
//
// Run with: bun run screenshots
//   (which is: vite build && vite preview & node scripts/screenshots.mjs)

import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'screenshots')
const BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Build a burn state where `wantTimePercent` of the rolling week has already
 * elapsed (= `timePercent` lands on the requested integer). resetDate is set
 * accordingly relative to "now" so the app computes the same number live.
 */
function stateAtWeekPosition({ wantTimePercent, usagePercent }) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const elapsedMs = (wantTimePercent / 100) * WEEK_MS
  const resetIn = WEEK_MS - elapsedMs
  const resetDate = new Date(Date.now() + resetIn)
  return {
    resetDate: toLocalISO(resetDate),
    usagePercent,
    setupComplete: true,
    lastSeen: new Date().toISOString(),
  }
}

async function shoot(browser, { name, viewport, device, state, locale = 'de', wait = 1200 }) {
  const contextOpts = device ? { ...devices[device] } : { viewport }
  contextOpts.locale = locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-GB'
  const ctx = await browser.newContext(contextOpts)
  const page = await ctx.newPage()

  await page.addInitScript(({ s, locale }) => {
    localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
    localStorage.setItem('burnRate:locale', locale)
  }, { s: state, locale })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  // Let the entry animations + transition finish so cards aren't mid-cascade.
  await page.waitForTimeout(wait)

  const path = resolve(OUT_DIR, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`✓ ${name}.png`)
  await ctx.close()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()

  // 1) Hero — desktop main view, mid-week, "Chill Pace" feel
  await shoot(browser, {
    name: '01-hero-desktop',
    viewport: { width: 1440, height: 900 },
    state: stateAtWeekPosition({ wantTimePercent: 42, usagePercent: 38 }),
    locale: 'de',
  })

  // 2) High-burn drama — "Sparmodus", red verdict, urgency
  await shoot(browser, {
    name: '02-burn-warning',
    viewport: { width: 1280, height: 900 },
    state: stateAtWeekPosition({ wantTimePercent: 55, usagePercent: 84 }),
    locale: 'de',
  })

  // 3) ExhaustedCard at 100% — countdown hero
  await shoot(browser, {
    name: '03-exhausted-countdown',
    viewport: { width: 1280, height: 900 },
    state: stateAtWeekPosition({ wantTimePercent: 70, usagePercent: 100 }),
    locale: 'de',
  })

  // 4) Mobile shot — iPhone 13 viewport, mid-range usage
  await shoot(browser, {
    name: '04-mobile-main',
    device: 'iPhone 13',
    state: stateAtWeekPosition({ wantTimePercent: 35, usagePercent: 29 }),
    locale: 'de',
  })

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
