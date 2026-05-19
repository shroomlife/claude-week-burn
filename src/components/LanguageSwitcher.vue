<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import IconGlobe from '~icons/ph/globe'
import IconCaretDown from '~icons/ph/caret-down-bold'
import { useLocale, LOCALES } from '../i18n'

const { locale } = useLocale()

const open = ref(false)
const rootEl = ref<HTMLDivElement | null>(null)

// LOCALES is non-empty by design, so the fallback is a type-safe assertion
// for vue-tsc — runtime always picks the matching entry or the first one.
const currentDef = computed(
  (): { code: string; label: string; flag: string } =>
    LOCALES.find((l) => l.code === locale.value) ?? LOCALES[0]!,
)

function toggle(): void { open.value = !open.value }
function close(): void { open.value = false }
function pick(code: string): void {
  locale.value = code
  close()
}

function onDocClick(e: MouseEvent): void {
  if (!open.value) return
  const target = e.target as Node | null
  if (rootEl.value && target && !rootEl.value.contains(target)) close()
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})

// When the menu opens, focus the active item so keyboard nav makes sense.
const menuEl = ref<HTMLUListElement | null>(null)
async function onOpenFocus(): Promise<void> {
  await nextTick()
  if (!menuEl.value) return
  const active = menuEl.value.querySelector<HTMLButtonElement>('button[aria-current="true"]')
  active?.focus()
}
</script>

<template>
  <div ref="rootEl" class="lang-wrap">
    <button
      type="button"
      class="lang-pill"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :title="$t('lang.switcher')"
      :aria-label="$t('lang.switcher')"
      @click="toggle(); open && onOpenFocus()"
    >
      <IconGlobe class="globe" />
      <span class="code">{{ currentDef.code.toUpperCase() }}</span>
      <IconCaretDown class="caret" :class="{ open }" />
    </button>

    <transition name="pop">
      <ul
        v-if="open"
        ref="menuEl"
        class="menu"
        role="listbox"
        :aria-label="$t('lang.switcher')"
      >
        <li v-for="l in LOCALES" :key="l.code">
          <button
            type="button"
            role="option"
            class="menu-item"
            :aria-current="l.code === locale ? 'true' : 'false'"
            :aria-selected="l.code === locale"
            @click="pick(l.code)"
          >
            <span class="flag" aria-hidden="true">{{ l.flag }}</span>
            <span class="label">{{ l.label }}</span>
            <span class="code-mono">{{ l.code.toUpperCase() }}</span>
          </button>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.lang-wrap {
  position: relative;
  display: inline-flex;
}

.lang-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 500;
  color: var(--c-ink);
  cursor: pointer;
  letter-spacing: -0.005em;
  transition: background 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
}
.lang-pill:hover { background: rgba(15, 23, 42, 0.03); transform: translateY(-1px); }
.lang-pill .globe { width: 13px; height: 13px; color: var(--c-mute); flex-shrink: 0; }
.lang-pill .code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: var(--c-ink);
}
.lang-pill .caret {
  width: 10px;
  height: 10px;
  color: var(--c-mute);
  transition: transform 0.18s var(--ease-spring);
}
.lang-pill .caret.open { transform: rotate(180deg); }

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: white;
  border: 1px solid var(--c-hair);
  border-radius: 12px;
  box-shadow: 0 18px 40px -16px rgba(15, 23, 42, 0.28);
  min-width: 168px;
  z-index: 50;
}

.menu-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--c-ink-soft);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  font-family: var(--font-sans);
}
.menu-item:hover { background: rgba(15, 23, 42, 0.05); color: var(--c-ink); }
.menu-item[aria-current='true'] {
  background: rgba(234, 88, 12, 0.08);
  color: var(--c-flame-2);
}
.menu-item .flag { font-size: 16px; line-height: 1; }
.menu-item .label { font-weight: 500; letter-spacing: -0.005em; }
.menu-item .code-mono {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.02em;
  color: var(--c-mute);
}
.menu-item[aria-current='true'] .code-mono { color: var(--c-flame-2); }

.pop-enter-active, .pop-leave-active {
  transition: opacity 0.16s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top right;
}
.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}

@media (max-width: 560px) {
  .lang-pill { padding: 5px 8px; gap: 5px; }
  .lang-pill .code { font-size: 11px; }
}
</style>
