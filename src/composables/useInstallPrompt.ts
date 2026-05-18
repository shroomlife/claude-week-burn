import { computed, onMounted, onUnmounted, ref, type ComputedRef } from 'vue'

/**
 * Chrome / Edge / Brave fire a `beforeinstallprompt` Event that lets us
 * defer the install UI to a moment of our choosing. iOS Safari has no API
 * for this — there it must be a manual "Add to Home Screen" via the share
 * sheet, so we instead show an instruction modal.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isStandalone = ref(false)
const isIosLike = ref(false)
const isAppInstalled = ref(false)

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS reports as Mac but supports touch — common detection used by Apple PWAs.
  const isiPadOS = navigator.maxTouchPoints > 1 && /Mac/.test(ua) && !/Windows/.test(ua)
  return /iPad|iPhone|iPod/.test(ua) || isiPadOS
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return mq || iosStandalone
}

let listenersBound = 0

function onBeforeInstallPrompt(e: Event): void {
  // Prevent the browser's default mini-infobar so we can present our own UI.
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent
}

function onAppInstalled(): void {
  isAppInstalled.value = true
  isStandalone.value = true
  deferredPrompt.value = null
}

function bind(): void {
  if (listenersBound === 0) {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    isIosLike.value = detectIos()
    isStandalone.value = detectStandalone()
  }
  listenersBound += 1
}

function unbind(): void {
  listenersBound = Math.max(0, listenersBound - 1)
  if (listenersBound === 0) {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
  }
}

async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const p = deferredPrompt.value
  if (!p) return 'unavailable'
  try {
    await p.prompt()
    const choice = await p.userChoice
    deferredPrompt.value = null
    if (choice.outcome === 'accepted') isAppInstalled.value = true
    return choice.outcome
  } catch {
    deferredPrompt.value = null
    return 'unavailable'
  }
}

export interface InstallPromptApi {
  /** True if a native install prompt is available right now (Android/Chromium). */
  canInstall: ComputedRef<boolean>
  /** True if user is on iOS-like and not yet installed → show manual instructions. */
  needsIosInstructions: ComputedRef<boolean>
  /** True if running in standalone display mode (installed PWA, opened from home screen). */
  isStandalone: ComputedRef<boolean>
  /** True if the app was installed during this session. */
  isAppInstalled: ComputedRef<boolean>
  /** Trigger the native install prompt; returns the outcome or 'unavailable'. */
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

export function useInstallPrompt(): InstallPromptApi {
  onMounted(bind)
  onUnmounted(unbind)
  return {
    canInstall: computed(() => deferredPrompt.value !== null && !isStandalone.value),
    needsIosInstructions: computed(() => isIosLike.value && !isStandalone.value),
    isStandalone: computed(() => isStandalone.value),
    isAppInstalled: computed(() => isAppInstalled.value),
    install,
  }
}
