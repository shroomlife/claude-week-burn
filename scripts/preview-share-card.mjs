// Open the live preview, set deterministic state, trigger the share action
// via the command palette, and save the downloaded PNG so we can eyeball it
// before deploying.

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'screenshots', 'share-card')
const URL = process.env.SHARE_PREVIEW_URL ?? 'http://localhost:4177/'

function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  })
  const page = await ctx.newPage()

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
  await page.waitForTimeout(1500)

  // Open command palette and click "Share"
  await page.keyboard.press('Control+K')
  await page.waitForTimeout(400)
  await page.fill('input[type="text"]', 'share')
  await page.waitForTimeout(200)

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
    page.keyboard.press('Enter'),
  ])

  if (download) {
    const path = resolve(OUT_DIR, 'card-de.png')
    await download.saveAs(path)
    console.log(`✓ saved ${path}`)
  } else {
    console.warn('No download triggered — share may have opened native share sheet or errored')
  }

  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
