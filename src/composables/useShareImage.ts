/**
 * Generates a 1200x630 social-share card PNG from the current burn-rate
 * data — pure client-side Canvas, no server, no API key. The user-visible
 * share action calls this and either fires the native share sheet (with
 * the image file) or falls back to a download.
 */

export interface ShareCardData {
  usagePercent: number
  timePercent: number
  delta: number
  remainingPercent: number
  dailyBudget: number
  countdownDays: number
  countdownHours: number
  statusLabel: string
  brand: string
  tagline: string
  url: string
  /** Locale code for caption fallbacks. */
  locale: string
}

export interface GradientPalette {
  /** Stable id for analytics / persistence; not shown to the user. */
  id: string
  /** Display name (English, used in tooltips if needed). */
  name: string
  /** 3 hex stops, top-left → middle → bottom-right of the canvas. */
  stops: [string, string, string]
  /** Aurora-blob accent colors layered on top in 'screen' blend mode. */
  blobs: [string, string, string]
}

/**
 * Curated palettes — every entry was eyeballed at 1200×630 for readable
 * white text + good visual energy. Order matters only as the first-render
 * default; the shuffle button picks a different one at random each click.
 */
export const GRADIENT_PALETTES: readonly GradientPalette[] = [
  {
    id: 'brand',
    name: 'Brand',
    stops: ['#fb923c', '#f43f5e', '#d946ef'],
    blobs: ['rgba(255, 220, 150, 0.55)', 'rgba(255, 180, 200, 0.45)', 'rgba(220, 150, 255, 0.5)'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    stops: ['#fbbf24', '#fb923c', '#dc2626'],
    blobs: ['rgba(255, 230, 120, 0.55)', 'rgba(255, 200, 100, 0.4)', 'rgba(255, 130, 110, 0.45)'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    stops: ['#34d399', '#22d3ee', '#a78bfa'],
    blobs: ['rgba(160, 255, 220, 0.5)', 'rgba(170, 230, 255, 0.45)', 'rgba(200, 180, 255, 0.5)'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    stops: ['#22d3ee', '#0891b2', '#1e40af'],
    blobs: ['rgba(160, 240, 255, 0.5)', 'rgba(140, 200, 240, 0.45)', 'rgba(140, 170, 230, 0.5)'],
  },
  {
    id: 'twilight',
    name: 'Twilight',
    stops: ['#7e22ce', '#3b82f6', '#06b6d4'],
    blobs: ['rgba(210, 170, 255, 0.45)', 'rgba(160, 190, 255, 0.5)', 'rgba(140, 220, 240, 0.5)'],
  },
  {
    id: 'candy',
    name: 'Candy',
    stops: ['#ec4899', '#a78bfa', '#3b82f6'],
    blobs: ['rgba(255, 180, 220, 0.5)', 'rgba(220, 190, 255, 0.45)', 'rgba(170, 200, 255, 0.5)'],
  },
  {
    id: 'lime',
    name: 'Lime',
    stops: ['#84cc16', '#22c55e', '#0d9488'],
    blobs: ['rgba(220, 255, 160, 0.5)', 'rgba(170, 240, 200, 0.45)', 'rgba(150, 230, 220, 0.5)'],
  },
  {
    id: 'peach',
    name: 'Peach',
    stops: ['#fed7aa', '#fb923c', '#ef4444'],
    blobs: ['rgba(255, 230, 200, 0.55)', 'rgba(255, 200, 160, 0.45)', 'rgba(255, 170, 160, 0.5)'],
  },
  {
    id: 'rose',
    name: 'Rose',
    stops: ['#fda4af', '#f43f5e', '#9f1239'],
    blobs: ['rgba(255, 200, 210, 0.55)', 'rgba(255, 170, 190, 0.45)', 'rgba(240, 150, 170, 0.5)'],
  },
  {
    id: 'mint',
    name: 'Mint',
    stops: ['#5eead4', '#22d3ee', '#3b82f6'],
    blobs: ['rgba(190, 255, 240, 0.5)', 'rgba(170, 240, 250, 0.45)', 'rgba(170, 200, 255, 0.5)'],
  },
  {
    id: 'violet',
    name: 'Violet',
    stops: ['#a78bfa', '#8b5cf6', '#6366f1'],
    blobs: ['rgba(220, 200, 255, 0.5)', 'rgba(200, 180, 255, 0.45)', 'rgba(180, 180, 255, 0.5)'],
  },
  {
    id: 'fire',
    name: 'Fire',
    stops: ['#facc15', '#f97316', '#b91c1c'],
    blobs: ['rgba(255, 240, 150, 0.55)', 'rgba(255, 190, 120, 0.45)', 'rgba(255, 130, 120, 0.5)'],
  },
] as const

/** Pick a random palette that's NOT the one passed in. */
export function nextPalette(current?: GradientPalette): GradientPalette {
  if (GRADIENT_PALETTES.length <= 1) return GRADIENT_PALETTES[0]!
  let pick = GRADIENT_PALETTES[Math.floor(Math.random() * GRADIENT_PALETTES.length)]!
  while (current && pick.id === current.id) {
    pick = GRADIENT_PALETTES[Math.floor(Math.random() * GRADIENT_PALETTES.length)]!
  }
  return pick
}

const CARD_W = 1200
const CARD_H = 630

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
  grad.addColorStop(0, color)
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Draws a single share card and returns a PNG Blob. Caller is responsible
 * for awaiting document.fonts.ready before this if it wants the brand fonts
 * (Outfit / JetBrains Mono) rather than system-ui fallbacks.
 *
 * @param palette optional gradient palette; defaults to the brand palette
 *                (orange → pink → magenta). Pass a value from
 *                GRADIENT_PALETTES to render in a different vibe.
 */
export async function buildShareCardBlob(
  data: ShareCardData,
  palette: GradientPalette = GRADIENT_PALETTES[0]!,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const maybeCtx = canvas.getContext('2d')
  if (!maybeCtx) throw new Error('Canvas 2D context unavailable')
  // Re-bind to a definitely-non-null const so the narrowing survives the
  // awaits below (TS loses control-flow narrowing across async boundaries).
  const ctx: CanvasRenderingContext2D = maybeCtx

  // === Background — main gradient from palette ==========================
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bg.addColorStop(0, palette.stops[0])
  bg.addColorStop(0.55, palette.stops[1])
  bg.addColorStop(1, palette.stops[2])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Subtle aurora highlights for depth (screen blending) — palette-aware.
  ctx.globalCompositeOperation = 'screen'
  drawBlob(ctx, 180, 120, 320, palette.blobs[0])
  drawBlob(ctx, 1020, 80, 280, palette.blobs[1])
  drawBlob(ctx, 950, 540, 360, palette.blobs[2])
  ctx.globalCompositeOperation = 'source-over'

  // === Logo + brand wordmark ==========================================
  try {
    // Resolve logo path against current base for the deployed sub-path.
    const base = (typeof document !== 'undefined' ? document.baseURI : '/')
    const logoUrl = new URL('logo.svg', base).toString()
    const logo = await loadImage(logoUrl)
    // Clip to a rounded-square so the logo sits like a proper iOS-style
    // app icon, regardless of any padding the source SVG happens to have
    // (and matches the look we ship for PWA icons). Save/restore brackets
    // keep the clip from leaking into later drawImage / fillText calls.
    const logoX = 60
    const logoY = 60
    const logoSize = 88
    const logoRadius = 22
    ctx.save()
    roundedRect(ctx, logoX, logoY, logoSize, logoSize, logoRadius)
    ctx.clip()
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
    ctx.restore()
  } catch {
    // logo missing — skip silently. Wordmark + content carry the brand.
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)'
  ctx.font = '600 36px "Outfit Variable", system-ui, -apple-system, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(data.brand, 168, 92)

  ctx.font = '400 18px "Outfit Variable", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
  ctx.fillText(data.tagline, 168, 120)

  // === Hero usage % ==================================================
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'white'

  const usageStr = String(data.usagePercent)
  ctx.font = '700 260px "JetBrains Mono Variable", ui-monospace, monospace'
  const usageMetrics = ctx.measureText(usageStr)
  const usageX = 60
  const usageY = 420
  ctx.fillText(usageStr, usageX, usageY)

  // Percent sign smaller, hanging next to the number
  ctx.font = '600 90px "JetBrains Mono Variable", ui-monospace, monospace'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fillText('%', usageX + usageMetrics.width + 6, usageY)

  // Status label under the hero
  ctx.font = '600 22px "Outfit Variable", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  const statusText = data.statusLabel.toUpperCase()
  ctx.fillText(statusText, 60, 466)

  // === Right column: stats stack =====================================
  const rightX = 720
  const rightTop = 200

  function stat(label: string, value: string, y: number): void {
    ctx.font = '600 14px "Outfit Variable", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.fillText(label.toUpperCase(), rightX, y)

    ctx.font = '700 52px "JetBrains Mono Variable", ui-monospace, monospace'
    ctx.fillStyle = 'white'
    ctx.fillText(value, rightX, y + 56)
  }

  const sign = data.delta >= 0 ? '+' : '−'
  const deltaLabel = data.delta >= 0 ? 'HEADROOM' : 'OVERSHOOT'
  stat('TIME ELAPSED', `${data.timePercent}%`, rightTop)
  stat(deltaLabel, `${sign}${Math.abs(data.delta)}%`, rightTop + 100)
  stat('RESET IN', `${data.countdownDays}d ${String(data.countdownHours).padStart(2, '0')}h`, rightTop + 200)

  // === Footer URL pill ===============================================
  ctx.font = '500 18px "JetBrains Mono Variable", ui-monospace, monospace'
  const urlLabel = data.url.replace(/^https?:\/\//, '')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
  const padX = 18
  const urlMetrics = ctx.measureText(urlLabel)
  const pillW = urlMetrics.width + padX * 2
  const pillH = 38
  const pillX = 60
  const pillY = 540
  roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.fill()
  ctx.fillStyle = 'white'
  ctx.textBaseline = 'middle'
  ctx.fillText(urlLabel, pillX + padX, pillY + pillH / 2 + 1)

  // === Daily-budget chip on right ====================================
  ctx.font = '500 16px "Outfit Variable", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
  ctx.textBaseline = 'middle'
  const budgetLabel = `Daily budget · ${data.dailyBudget}% / day · ${data.remainingPercent}% left`
  const bm = ctx.measureText(budgetLabel)
  ctx.fillText(budgetLabel, CARD_W - 60 - bm.width, pillY + pillH / 2 + 1)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('toBlob returned null'))
    }, 'image/png')
  })
}

/**
 * Triggers the native share sheet with the image if supported (mobile +
 * recent Edge/Chrome on macOS), else falls back to a download. Returns
 * a tag so the caller can toast accordingly.
 */
export async function shareOrDownload(
  blob: Blob,
  fileName: string,
  caption: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], fileName, { type: 'image/png' })

  // Some browsers (Safari macOS) have navigator.share but only accept
  // text+url. Use canShare to gate file support.
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: caption, title: 'Claude Burn Rate' })
      return 'shared'
    } catch (err) {
      // User cancelled — bubble up as cancelled (treat as no-op).
      if ((err as Error)?.name === 'AbortError') return 'shared'
      // Otherwise fall through to download.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
