// Visual test: open share modal, click Shuffle 5 times, screenshot each
// state to verify the gradient + logo-clip changes look right.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'screenshots', 'share-shuffle')
const URL = process.env.URL ?? 'http://localhost:4181/'

function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
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

  // Open share via command palette
  await page.keyboard.press('Control+K')
  await page.waitForTimeout(400)
  await page.fill('input[type="text"]', 'share')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2500)

  // Screenshot initial (brand palette)
  await page.locator('.preview').first().screenshot({ path: resolve(OUT, '01-brand.png') })
  console.log('✓ 01-brand.png')

  for (let i = 2; i <= 6; i++) {
    await page.locator('.shuffle-btn').click()
    await page.waitForTimeout(1200)
    await page.locator('.preview').first().screenshot({ path: resolve(OUT, `${String(i).padStart(2, '0')}-shuffled.png`) })
    console.log(`✓ ${String(i).padStart(2, '0')}-shuffled.png`)
  }

  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
