import { createI18n } from 'vue-i18n'
import { computed, watch, type WritableComputedRef } from 'vue'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import pt from './locales/pt.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zh from './locales/zh.json'
import hi from './locales/hi.json'
import uk from './locales/uk.json'

/**
 * Add a new language in 3 steps:
 *   1. Create src/i18n/locales/<code>.json (copy en.json, translate)
 *   2. Import it above + add to `messages` below
 *   3. Add entry to LOCALES + flag icon import in LanguageSwitcher.vue
 */

export interface LocaleDef {
  code: string
  label: string
  /**
   * ISO 3166-1 alpha-2 country code that maps to a circle-flags icon
   * (`~icons/circle-flags/<flagCode>`). The icon component itself is
   * looked up in LanguageSwitcher.vue — this stays a string so locale
   * data remains JSON-serialisable and easy to extend.
   */
  flagCode: string
}

// Order matters — it's the visible order in the switcher dropdown.
// Prioritised by where Claude is actually used (Anthropic Economic Index
// 2025) blended with developer population (Stack Overflow 2024): EN +
// large-share languages first, then long-tail markets.
export const LOCALES: readonly LocaleDef[] = [
  { code: 'en', label: 'English', flagCode: 'gb' },
  { code: 'de', label: 'Deutsch', flagCode: 'de' },
  { code: 'es', label: 'Español', flagCode: 'es' },
  { code: 'fr', label: 'Français', flagCode: 'fr' },
  { code: 'pt', label: 'Português', flagCode: 'br' },
  { code: 'ja', label: '日本語', flagCode: 'jp' },
  { code: 'ko', label: '한국어', flagCode: 'kr' },
  { code: 'zh', label: '中文', flagCode: 'cn' },
  { code: 'hi', label: 'हिन्दी', flagCode: 'in' },
  { code: 'uk', label: 'Українська', flagCode: 'ua' },
] as const

const STORAGE_KEY = 'burnRate:locale'
const DEFAULT_LOCALE = 'de'

function detectInitialLocale(): string {
  // 1. Explicit user choice in localStorage wins.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LOCALES.some((l) => l.code === saved)) return saved
  } catch { /* storage may be unavailable */ }

  // 2. navigator.language / languages fallback chain. Match by primary tag.
  const browserLangs: readonly string[] =
    typeof navigator === 'undefined'
      ? []
      : [...(navigator.languages ?? []), navigator.language].filter(Boolean)

  for (const lang of browserLangs) {
    const primary = lang.toLowerCase().split('-')[0] ?? ''
    const hit = LOCALES.find((l) => l.code === primary)
    if (hit) return hit.code
  }

  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { de, en, es, fr, pt, ja, ko, zh, hi, uk },
})

/**
 * Reactive locale getter/setter. Persists to localStorage on change and
 * updates <html lang> so the document reflects the user's choice (a11y +
 * font-rendering hints).
 */
export function useLocale(): {
  locale: WritableComputedRef<string>
  locales: typeof LOCALES
} {
  const locale = computed({
    get: () => i18n.global.locale.value as string,
    set: (v: string) => {
      // i18n.global.locale's setter is typed against the union of message keys
      // ('de' | 'en' | 'es' here). We accept any string for runtime flexibility
      // (LOCALES is the source of truth) and cast at the boundary.
      ;(i18n.global.locale as unknown as { value: string }).value = v
    },
  })

  return { locale, locales: LOCALES }
}

// Persist locale changes + reflect on <html lang>.
watch(
  () => i18n.global.locale.value,
  (v) => {
    try { localStorage.setItem(STORAGE_KEY, v) } catch { /* noop */ }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', v)
    }
  },
  { immediate: true },
)
