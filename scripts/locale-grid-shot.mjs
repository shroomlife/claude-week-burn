// Capture the language switcher dropdown open + a hero shot in each locale.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'screenshots', 'locales-10')
const URL = process.env.URL ?? 'http://localhost:4180/'

function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const STATE = {
  resetDate: toLocalISO(new Date(Date.now() + 4 * 86400000 + 3 * 3600000)),
  usagePercent: 36,
  setupComplete: true,
  lastSeen: new Date().toISOString(),
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()

  // Single shot showing the switcher OPEN with all 10 entries
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.addInitScript(({ s, locale }) => {
      localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
      localStorage.setItem('burnRate:locale', locale)
    }, { s: STATE, locale: 'en' })
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.click('.lang-pill')
    await page.waitForTimeout(500)
    await page.screenshot({ path: resolve(OUT, 'switcher-open.png'), clip: { x: 850, y: 0, width: 430, height: 500 } })
    console.log('✓ switcher-open.png')
    await ctx.close()
  }

  // Hero shot per locale
  for (const locale of ['en', 'de', 'es', 'fr', 'pt', 'ja', 'ko', 'zh', 'hi', 'uk']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.addInitScript(({ s, locale }) => {
      localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
      localStorage.setItem('burnRate:locale', locale)
    }, { s: STATE, locale })
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: resolve(OUT, `${locale}.png`), fullPage: false })
    console.log(`✓ ${locale}.png`)
    await ctx.close()
  }

  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
