<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconClose from '~icons/ph/x-bold'
import IconDownload from '~icons/ph/download-simple-bold'
import IconShare from '~icons/ph/share-network'
import IconCopy from '~icons/ph/copy'
import IconImage from '~icons/ph/image'
import IconShuffle from '~icons/ph/shuffle-bold'
import {
  buildShareCardBlob,
  GRADIENT_PALETTES,
  nextPalette,
  type ShareCardData,
  type GradientPalette,
} from '../composables/useShareImage'

const props = defineProps<{
  open: boolean
  /** Live data the canvas drawer needs. Null when modal isn't actively open. */
  cardData: ShareCardData | null
  /** Caption/text that goes with the image when sharing. */
  caption: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'copied'): void
}>()

const blob = ref<Blob | null>(null)
const previewUrl = ref<string | null>(null)
const generating = ref(false)
const palette = ref<GradientPalette>(GRADIENT_PALETTES[0]!)

async function regenerate(): Promise<void> {
  if (!props.cardData) return
  generating.value = true
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready
    }
    const next = await buildShareCardBlob(props.cardData, palette.value)
    blob.value = next
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(next)
  } catch (err) {
    console.warn('[share-modal] canvas build failed', err)
  } finally {
    generating.value = false
  }
}

// Open → render immediately. Close → release the blob URL so the GC can
// reclaim the canvas-derived bitmap (these are 1200x630 PNGs, not free).
watch(
  () => props.open,
  (open) => {
    if (open) {
      // Reset to default palette on each open — the shuffle is per-session.
      palette.value = GRADIENT_PALETTES[0]!
      blob.value = null
      void regenerate()
    } else {
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = null
      }
      blob.value = null
    }
  },
)

function onShuffle(): void {
  palette.value = nextPalette(palette.value)
  void regenerate()
}

const canShareFiles = computed(() => {
  if (!blob.value) return false
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false
  try {
    const file = new File([blob.value], 'card.png', { type: 'image/png' })
    return nav.canShare({ files: [file] })
  } catch {
    return false
  }
})

const canCopy = computed(() => {
  return typeof navigator !== 'undefined'
    && typeof ClipboardItem !== 'undefined'
    && Boolean(navigator.clipboard?.write)
})

function close(): void { emit('close') }

function fileName(): string {
  return `claude-burn-rate-${Date.now()}.png`
}

async function onDownload(): Promise<void> {
  if (!blob.value) return
  const url = URL.createObjectURL(blob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function onShare(): Promise<void> {
  if (!blob.value) return
  const file = new File([blob.value], fileName(), { type: 'image/png' })
  try {
    await (navigator as Navigator).share({
      files: [file],
      text: props.caption,
      title: 'Claude Burn Rate',
    })
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') {
      console.warn('[share] navigator.share rejected', err)
    }
  }
}

async function onCopy(): Promise<void> {
  if (!blob.value) return
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob.value }),
    ])
    emit('copied')
  } catch (err) {
    console.warn('[share] clipboard copy failed', err)
  }
}

function onKey(e: KeyboardEvent): void {
  if (!props.open) return
  if (e.key === 'Escape') close()
}

watch(() => props.open, (open) => {
  if (open) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="close">
      <transition name="card">
        <div v-if="open" class="dlg" role="dialog" aria-modal="true" aria-labelledby="share-dlg-title">
          <header class="dlg-head">
            <div class="head-text">
              <h2 id="share-dlg-title">{{ $t('share.modalTitle') }}</h2>
              <p>{{ $t('share.modalSubtitle') }}</p>
            </div>
            <button type="button" class="close" :aria-label="$t('share.close')" @click="close">
              <IconClose />
            </button>
          </header>

          <div class="preview-wrap">
            <div v-if="!previewUrl" class="preview-placeholder">
              <IconImage />
              <span>{{ $t('share.generating') }}</span>
            </div>
            <img
              v-else
              :src="previewUrl"
              :class="{ regenerating: generating }"
              alt="Burn rate share card"
              class="preview"
            />
            <button
              type="button"
              class="shuffle-btn"
              :disabled="generating"
              :title="$t('share.shuffle')"
              :aria-label="$t('share.shuffle')"
              @click="onShuffle"
            >
              <IconShuffle />
              <span class="shuffle-label">{{ palette.name }}</span>
            </button>
          </div>

          <p class="caption">{{ caption }}</p>

          <div class="actions">
            <button
              v-if="canShareFiles"
              type="button"
              class="btn primary"
              :disabled="!blob"
              @click="onShare"
            >
              <IconShare />
              <span>{{ $t('share.shareNative') }}</span>
            </button>
            <button
              type="button"
              class="btn"
              :class="{ primary: !canShareFiles }"
              :disabled="!blob"
              @click="onDownload"
            >
              <IconDownload />
              <span>{{ $t('share.download') }}</span>
            </button>
            <button
              v-if="canCopy"
              type="button"
              class="btn ghost"
              :disabled="!blob"
              @click="onCopy"
            >
              <IconCopy />
              <span>{{ $t('share.copy') }}</span>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.dlg-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 26, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: start center;
  padding: 6vh 16px 16px;
  z-index: 110;
  overflow-y: auto;
}
.dlg {
  width: min(640px, 100%);
  background: white;
  border-radius: 22px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.5);
  overflow: hidden;
  border: 1px solid var(--c-hair);
  display: flex;
  flex-direction: column;
}

.dlg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 20px 14px;
}
.head-text { min-width: 0; }
.head-text h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--c-ink);
}
.head-text p {
  margin: 0;
  font-size: 12.5px;
  color: var(--c-mute);
  letter-spacing: -0.005em;
  line-height: 1.5;
}
.close {
  background: transparent;
  border: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--c-mute);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.close:hover { background: rgba(15, 23, 42, 0.05); color: var(--c-ink); }
.close :deep(svg) { width: 14px; height: 14px; }

.preview-wrap {
  position: relative;
  margin: 0 20px;
  background: rgba(15, 23, 42, 0.03);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
  overflow: hidden;
  /* Reserve the 1200x630 aspect so the layout doesn't jump on load. */
  aspect-ratio: 1200 / 630;
}
.preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.18s ease;
}
.preview.regenerating { opacity: 0.55; }

.shuffle-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 8px;
  background: rgba(15, 23, 42, 0.78);
  color: white;
  border: 0;
  border-radius: var(--r-pill);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 4px 14px -4px rgba(15, 23, 42, 0.35);
  transition: transform 0.15s var(--ease-spring), background 0.18s ease;
}
.shuffle-btn:hover:not(:disabled) { background: rgba(15, 23, 42, 0.92); transform: translateY(-1px); }
.shuffle-btn:disabled { opacity: 0.6; cursor: progress; }
.shuffle-btn :deep(svg) { width: 14px; height: 14px; }
.shuffle-label { font-family: var(--font-sans); }
.preview-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--c-mute);
  font-size: 13px;
}
.preview-placeholder :deep(svg) { width: 32px; height: 32px; opacity: 0.4; }

.caption {
  margin: 14px 20px 0;
  padding: 11px 14px;
  background: rgba(15, 23, 42, 0.025);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--c-ink-soft);
  letter-spacing: -0.02em;
  line-height: 1.5;
  word-break: break-word;
}

.actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px 20px;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 11px 16px;
  border-radius: var(--r-input);
  border: 1px solid var(--c-hair);
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  background: transparent;
  color: var(--c-ink-soft);
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.btn :deep(svg) { width: 15px; height: 15px; flex-shrink: 0; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.04);
  color: var(--c-ink);
  transform: translateY(-1px);
}
.btn.primary {
  background: var(--c-ink);
  color: white;
  border-color: var(--c-ink);
}
.btn.primary:hover:not(:disabled) { background: #1e293b; }
.btn.ghost {
  background: transparent;
  color: var(--c-mute);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.card-enter-active { transition: opacity 0.22s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
.card-leave-active { transition: opacity 0.18s ease, transform 0.22s ease; }
.card-enter-from { opacity: 0; transform: translateY(12px) scale(0.985); }
.card-leave-to { opacity: 0; transform: translateY(-6px) scale(0.985); }

@media (prefers-reduced-motion: reduce) {
  .card-enter-active, .card-leave-active { transition: opacity 0.2s ease; }
  .card-enter-from, .card-leave-to { transform: none; }
}

@media (max-width: 480px) {
  .dlg-backdrop { padding: 4vh 12px 12px; }
  .dlg-head { padding: 16px 16px 12px; }
  .preview-wrap { margin: 0 16px; }
  .caption { margin: 12px 16px 0; }
  .actions { padding: 14px 16px 18px; flex-direction: column; }
  .btn { width: 100%; }
}
</style>
