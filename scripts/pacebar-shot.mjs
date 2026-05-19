// Tightly cropped shot of just the PaceBar so we can verify the seam fix.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'screenshots', 'pacebar')
const URL = process.env.URL ?? 'http://localhost:4179/'

function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function shoot(usage, name) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.addInitScript(({ s, locale }) => {
    localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
    localStorage.setItem('burnRate:locale', locale)
  }, {
    s: {
      resetDate: toLocalISO(new Date(Date.now() + 4 * 86400000 + 2 * 3600000)),
      usagePercent: usage,
      setupComplete: true,
      lastSeen: new Date().toISOString(),
    },
    locale: 'de',
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const el = await page.locator('.bar').first()
  await el.screenshot({ path: resolve(OUT_DIR, `${name}.png`) })
  console.log(`✓ ${name}.png`)
  await browser.close()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  // Different positions to verify all seam cases
  await shoot(35, 'usage-35-ahead')      // usage < time → headroom delta to the right of fill
  await shoot(75, 'usage-75-behind')     // usage > time (depends on day, may be either)
  await shoot(100, 'usage-100-full')
  await shoot(0, 'usage-0-empty')
}

main().catch((err) => { console.error(err); process.exit(1) })
