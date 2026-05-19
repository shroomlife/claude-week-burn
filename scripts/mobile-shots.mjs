// Capture the header on three mobile viewports so we can verify the new
// two-row layout doesn't wrap the app name and the actions row hugs the
// right edge cleanly.

import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'screenshots', 'mobile-check')
const URL = 'http://localhost:4173/'

function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const TARGETS = [
  { name: 'iphone-12-pro', device: 'iPhone 12 Pro', locale: 'de' },
  { name: 'iphone-se', device: 'iPhone SE', locale: 'de' },
  { name: 'pixel-5', device: 'Pixel 5', locale: 'de' },
  { name: 'iphone-12-pro-en', device: 'iPhone 12 Pro', locale: 'en' },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  for (const t of TARGETS) {
    const ctx = await browser.newContext({ ...devices[t.device] })
    const page = await ctx.newPage()

    await page.addInitScript(({ s, locale }) => {
      localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
      localStorage.setItem('burnRate:locale', locale)
    }, {
      s: {
        resetDate: toLocalISO(new Date(Date.now() + 4 * 86400000 + 6 * 3600000)),
        usagePercent: 33,
        setupComplete: true,
        lastSeen: new Date().toISOString(),
      },
      locale: t.locale,
    })

    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    await page.screenshot({
      path: resolve(OUT_DIR, `${t.name}.png`),
      fullPage: true,
    })
    console.log(`✓ ${t.name}.png`)
    await ctx.close()
  }

  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
