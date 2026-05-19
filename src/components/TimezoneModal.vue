<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import IconSearch from '~icons/ph/magnifying-glass'
import IconClose from '~icons/ph/x-bold'
import IconCheck from '~icons/ph/check-bold'
import IconGlobe from '~icons/ph/globe'

const props = defineProps<{
  open: boolean
  /** Currently active timezone (override OR auto-detected). */
  current: string
  /** Whether the current value is an explicit override (vs auto-detected default). */
  isOverride: boolean
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', tz: string | null): void
}>()

const browserTz = computed<string>(() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' }
})

// Pull the full IANA zone list once. Falls back to a curated subset if the
// runtime doesn't support Intl.supportedValuesOf (older Safari < 15.4).
const ALL_TZ: string[] = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    if (typeof fn === 'function') return fn('timeZone')
  } catch { /* fall through */ }
  return [
    'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Europe/Madrid',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
    'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
  ]
})()

const query = ref('')
const selected = ref<string>(props.current)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLUListElement | null>(null)

watch(() => props.open, async (open) => {
  if (!open) return
  query.value = ''
  selected.value = props.current
  await nextTick()
  inputEl.value?.focus()
  // Scroll the currently selected item into view.
  await nextTick()
  const active = listEl.value?.querySelector<HTMLElement>('li[aria-selected="true"]')
  active?.scrollIntoView({ block: 'center' })
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return ALL_TZ
  return ALL_TZ.filter((tz) => tz.toLowerCase().includes(q))
})

function pick(tz: string): void {
  selected.value = tz
}

function useAuto(): void {
  selected.value = browserTz.value
  // Signal that we want to clear the override on save.
  selectedIsAuto.value = true
}

const selectedIsAuto = ref<boolean>(!props.isOverride)

watch(selected, () => {
  // If the user picks anything other than the browser default explicitly,
  // mark as an override. Useful so 'Auto' button shows that switch.
  selectedIsAuto.value = selected.value === browserTz.value && !props.isOverride
})

watch(() => props.isOverride, (v) => { selectedIsAuto.value = !v }, { immediate: true })

function cancel(): void { emit('cancel') }
function save(): void {
  // selectedIsAuto + selected === browser default → clear override (emit null).
  // Any explicit pick → emit that tz string as override.
  if (selectedIsAuto.value && selected.value === browserTz.value) {
    emit('save', null)
  } else {
    emit('save', selected.value)
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') cancel()
  if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'INPUT') save()
}
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="cancel" @keydown="onKey">
      <transition name="card">
        <div v-if="open" class="dlg" role="dialog" aria-modal="true" aria-labelledby="tz-dlg-title">
          <header class="dlg-head">
            <div class="head-text">
              <h2 id="tz-dlg-title"><IconGlobe class="head-icon" /> {{ $t('tz.title') }}</h2>
              <p>{{ $t('tz.subtitle') }}</p>
            </div>
            <button type="button" class="close" :aria-label="$t('tz.cancel')" @click="cancel">
              <IconClose />
            </button>
          </header>

          <div class="search-bar">
            <IconSearch />
            <input
              ref="inputEl"
              v-model="query"
              type="text"
              :placeholder="$t('tz.search')"
              spellcheck="false"
              autocomplete="off"
            />
            <button
              type="button"
              class="auto-pill"
              :aria-pressed="selectedIsAuto"
              :class="{ active: selectedIsAuto }"
              @click="useAuto"
            >
              {{ $t('tz.useAuto') }}
            </button>
          </div>

          <p class="auto-note">{{ $t('tz.autoNote', { tz: browserTz }) }}</p>

          <ul v-if="filtered.length > 0" ref="listEl" class="tz-list" role="listbox" :aria-label="$t('tz.title')">
            <li
              v-for="tz in filtered"
              :key="tz"
              role="option"
              :aria-selected="tz === selected"
              :class="{ active: tz === selected }"
              @click="pick(tz)"
            >
              <span class="tz-name">{{ tz }}</span>
              <IconCheck v-if="tz === selected" class="tz-check" />
            </li>
          </ul>
          <p v-else class="empty">{{ $t('tz.noResults') }}</p>

          <footer class="dlg-foot">
            <button type="button" class="btn ghost" @click="cancel">{{ $t('tz.cancel') }}</button>
            <button type="button" class="btn primary" @click="save">{{ $t('tz.save') }}</button>
          </footer>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.dlg-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 26, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: start center;
  padding: 8vh 16px 16px;
  z-index: 110;
}
.dlg {
  width: min(520px, 100%);
  max-height: 80vh;
  background: white;
  border-radius: 22px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.45);
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
  border-bottom: 1px solid var(--c-hair);
}
.head-text { min-width: 0; }
.head-text h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--c-ink);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.head-icon { width: 16px; height: 16px; color: var(--c-flame-2); }
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px 8px;
}
.search-bar :deep(svg) { width: 15px; height: 15px; color: var(--c-mute); flex-shrink: 0; }
.search-bar input {
  flex: 1;
  border: 1px solid var(--c-hair);
  border-radius: var(--r-pill);
  padding: 8px 12px;
  font-size: 13.5px;
  font-family: var(--font-sans);
  color: var(--c-ink);
  background: var(--c-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.search-bar input:focus { border-color: var(--c-flame-2); }

.auto-pill {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  padding: 6px 11px;
  border-radius: var(--r-pill);
  background: transparent;
  border: 1px solid var(--c-hair);
  color: var(--c-mute);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.auto-pill:hover { background: rgba(15, 23, 42, 0.04); color: var(--c-ink); }
.auto-pill.active {
  background: rgba(234, 88, 12, 0.1);
  border-color: rgba(234, 88, 12, 0.4);
  color: var(--c-flame-2);
}

.auto-note {
  margin: 0;
  padding: 0 18px 8px;
  font-size: 11.5px;
  color: var(--c-mute-soft);
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
}

.tz-list {
  list-style: none;
  margin: 0;
  padding: 6px 12px 8px;
  overflow-y: auto;
  flex: 1;
}
.tz-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  letter-spacing: -0.02em;
  color: var(--c-ink-soft);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.tz-list li:hover { background: rgba(15, 23, 42, 0.04); color: var(--c-ink); }
.tz-list li.active {
  background: rgba(234, 88, 12, 0.08);
  color: var(--c-flame-2);
}
.tz-check { width: 14px; height: 14px; color: var(--c-flame-2); }

.empty {
  padding: 22px;
  text-align: center;
  font-size: 13px;
  color: var(--c-mute);
}

.dlg-foot {
  display: flex;
  gap: 8px;
  padding: 14px 18px 18px;
  border-top: 1px solid var(--c-hair);
}
.btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--r-input);
  border: 1px solid transparent;
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.btn.ghost {
  background: transparent;
  color: var(--c-mute);
  border-color: var(--c-hair);
}
.btn.ghost:hover { background: rgba(15, 23, 42, 0.04); color: var(--c-ink); transform: translateY(-1px); }
.btn.primary { background: var(--c-ink); color: white; }
.btn.primary:hover { background: #1e293b; transform: translateY(-1px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.card-enter-active { transition: opacity 0.2s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
.card-leave-active { transition: opacity 0.16s ease, transform 0.2s ease; }
.card-enter-from { opacity: 0; transform: translateY(10px) scale(0.985); }
.card-leave-to { opacity: 0; transform: translateY(-4px) scale(0.985); }

@media (prefers-reduced-motion: reduce) {
  .card-enter-active, .card-leave-active { transition: opacity 0.2s ease; }
  .card-enter-from, .card-leave-to { transform: none; }
}

@media (max-width: 480px) {
  .dlg-backdrop { padding: 4vh 12px 12px; }
  .dlg { max-height: 92vh; }
  .search-bar { flex-direction: column; align-items: stretch; gap: 8px; }
  .auto-pill { align-self: flex-end; }
}
</style>
