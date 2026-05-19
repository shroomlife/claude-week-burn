// Generate the OG / Twitter share-card hero image via OpenAI's image API.
// Uses the new logo as composition reference (if the model supports input
// images) so brand colors + bolt shape feel consistent with the app icon.
//
// Budget: 3 images total. Tries gpt-image-2 first; if 4xx, retries with
// gpt-image-1 which is stable in production.

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(__dirname, '..', 'public')
const OUT_DIR = resolve(__dirname, '..', 'screenshots', 'og-card')

const PROMPT = [
  'Hero social-share card for an app called "Claude Burn Rate" — a tracker',
  'for weekly AI usage quotas. Bold abstract illustration: a glowing,',
  'stylized lightning bolt at the center, made of warm flowing flame and',
  'liquid light. The background is a smooth aurora gradient transitioning',
  'from warm orange in the top-left, through coral pink in the middle, to',
  'magenta-purple in the bottom-right, with soft luminous blobs of color.',
  'Modern, energetic, vibrant, minimalist editorial illustration aesthetic.',
  'High contrast between the bright lightning and the warm gradient.',
  'NO text, NO words, NO letters, NO numbers, NO UI elements, NO frames.',
  'Pure visual — just the lightning bolt on the gradient backdrop.',
  '16:9 landscape composition, plenty of negative space, suitable for an',
  'OG image / Twitter card overlay.',
].join(' ')

async function callOpenAI(model, n) {
  const body = {
    model,
    prompt: PROMPT,
    n,
    size: '1536x1024',
  }
  // gpt-image-1 supports quality + output_format
  if (model === 'gpt-image-1' || model === 'gpt-image-2') {
    body.quality = 'high'
    body.output_format = 'png'
  }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${model} ${res.status}: ${text.slice(0, 400)}`)
  }
  return JSON.parse(text)
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set')
  }
  await mkdir(OUT_DIR, { recursive: true })

  let data
  let modelUsed
  try {
    data = await callOpenAI('gpt-image-2', 3)
    modelUsed = 'gpt-image-2'
    console.log('✓ gpt-image-2 OK')
  } catch (err) {
    console.warn('gpt-image-2 unavailable, falling back to gpt-image-1')
    console.warn('  reason:', err.message)
    data = await callOpenAI('gpt-image-1', 3)
    modelUsed = 'gpt-image-1'
  }

  // Save all three so the user can pick. The API returns base64 by default.
  const images = data.data ?? []
  for (let i = 0; i < images.length; i += 1) {
    const img = images[i]
    let bytes
    if (img.b64_json) {
      bytes = Buffer.from(img.b64_json, 'base64')
    } else if (img.url) {
      const r = await fetch(img.url)
      bytes = Buffer.from(await r.arrayBuffer())
    } else {
      console.warn(`image ${i + 1} returned no b64_json or url, skipping`)
      continue
    }
    const out = resolve(OUT_DIR, `og-${modelUsed}-${i + 1}.png`)
    await writeFile(out, bytes)
    console.log(`✓ saved ${out} (${(bytes.length / 1024).toFixed(1)} KB)`)
  }

  console.log('\nReview the candidates in screenshots/og-card/, then pick:')
  console.log('  cp screenshots/og-card/og-<best>.png public/og-card.png')
}

main().catch((err) => { console.error(err); process.exit(1) })
