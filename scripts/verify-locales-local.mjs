// Quick local-preview screenshot of each locale for visual diff.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'screenshots', 'locale-check')
const URL = 'http://localhost:4173/'

function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  for (const locale of ['de', 'en', 'es']) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 1600 },
    })
    const page = await ctx.newPage()

    await page.addInitScript(({ s, locale }) => {
      localStorage.setItem('burnRate:v1', JSON.stringify({ v: 1, d: s }))
      localStorage.setItem('burnRate:locale', locale)
    }, {
      s: {
        resetDate: toLocalISO(new Date(Date.now() + 4 * 86400000 + 6 * 3600000)),
        usagePercent: 32,
        setupComplete: true,
        lastSeen: new Date().toISOString(),
      },
      locale,
    })

    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: resolve(OUT_DIR, `${locale}.png`),
      fullPage: true,
    })
    console.log(`✓ ${locale}.png`)
    await ctx.close()
  }

  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
