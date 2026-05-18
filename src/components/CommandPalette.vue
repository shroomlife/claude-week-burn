<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Search, CalendarClock, Equal, RefreshCw, Share2 } from 'lucide-vue-next'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'share'): void
  (e: 'snap'): void
  (e: 'sync'): void
  (e: 'new-week'): void
}>()

interface Action {
  id: 'snap' | 'sync' | 'share' | 'new-week'
  icon: typeof Search
  title: string
  hint: string
  keys: string
  emit: () => void
}

const actions: Action[] = [
  {
    id: 'snap',
    icon: CalendarClock,
    title: 'Reset auf 7 Tage ab jetzt',
    hint: 'Verschiebt das Wochenende-Datum exakt 7 Tage in die Zukunft.',
    keys: 'R',
    emit: () => emit('snap'),
  },
  {
    id: 'sync',
    icon: Equal,
    title: 'Usage = Zeit',
    hint: 'Setzt den Usage-Slider auf die aktuell verstrichene Zeit.',
    keys: 'S',
    emit: () => emit('sync'),
  },
  {
    id: 'new-week',
    icon: RefreshCw,
    title: 'Neue Woche starten',
    hint: 'Setzt Usage auf 0%. Das Reset-Datum bleibt unverändert.',
    keys: 'N',
    emit: () => emit('new-week'),
  },
  {
    id: 'share',
    icon: Share2,
    title: 'Share Burn Rate',
    hint: 'Teilt deinen aktuellen Stand als Text-Card.',
    keys: '⇧S',
    emit: () => emit('share'),
  },
]

const query = ref('')
const selectedIndex = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return actions
  return actions.filter((a) =>
    a.title.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q),
  )
})

watch(() => props.open, async (v) => {
  if (v) {
    query.value = ''
    selectedIndex.value = 0
    await nextTick()
    inputEl.value?.focus()
  }
})

watch(filtered, () => { selectedIndex.value = 0 })

function close(): void { emit('close') }
function trigger(a: Action): void { a.emit(); close() }

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') { close(); return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(filtered.value.length - 1, selectedIndex.value + 1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(0, selectedIndex.value - 1)
    return
  }
  if (e.key === 'Enter') {
    const action = filtered.value[selectedIndex.value]
    if (action) {
      e.preventDefault()
      trigger(action)
    }
  }
}
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="palette-backdrop" @click.self="close">
      <div class="palette" role="dialog" aria-modal="true" aria-label="Command Palette" @keydown="onKey">
        <div class="search-bar">
          <Search :size="16" :stroke-width="2" />
          <input
            ref="inputEl"
            v-model="query"
            type="text"
            placeholder="Action suchen…"
            spellcheck="false"
            autocomplete="off"
          />
          <kbd class="kbd">ESC</kbd>
        </div>
        <ul class="actions" role="listbox">
          <li
            v-for="(a, i) in filtered"
            :key="a.id"
            role="option"
            :aria-selected="i === selectedIndex"
            :class="{ active: i === selectedIndex }"
            @mouseenter="selectedIndex = i"
            @click="trigger(a)"
          >
            <component :is="a.icon" :size="16" :stroke-width="2" />
            <div class="action-text">
              <span class="title">{{ a.title }}</span>
              <span class="hint">{{ a.hint }}</span>
            </div>
            <kbd class="kbd">{{ a.keys }}</kbd>
          </li>
          <li v-if="filtered.length === 0" class="empty">Keine Action gefunden.</li>
        </ul>
        <div class="palette-foot">
          <span><kbd>↑↓</kbd> Navigieren</span>
          <span><kbd>↵</kbd> Auswählen</span>
          <span><kbd>ESC</kbd> Schließen</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 26, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: start center;
  padding-top: 12vh;
  z-index: 100;
}
.palette {
  width: min(560px, 92vw);
  background: white;
  border-radius: 18px;
  box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.45);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-divider);
  color: var(--c-mute);
}
.search-bar input {
  flex: 1;
  border: 0;
  outline: none;
  font-size: 15px;
  font-family: var(--font-sans);
  color: var(--c-ink);
}
.actions {
  list-style: none;
  margin: 0;
  padding: 6px;
  max-height: 50vh;
  overflow-y: auto;
}
.actions li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  color: var(--c-ink-soft);
}
.actions li.active { background: rgba(15, 23, 42, 0.06); }
.action-text { display: flex; flex-direction: column; min-width: 0; }
.action-text .title { font-weight: 600; font-size: 14px; }
.action-text .hint { font-size: 11.5px; color: var(--c-mute); }
.kbd {
  font-family: var(--font-mono);
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--c-mute);
  border: 1px solid rgba(15, 23, 42, 0.1);
}
.palette-foot {
  display: flex;
  gap: 14px;
  padding: 10px 14px;
  font-size: 11px;
  color: var(--c-mute);
  border-top: 1px solid var(--c-divider);
}
.palette-foot kbd {
  font-family: var(--font-mono);
  background: rgba(15, 23, 42, 0.06);
  padding: 1px 5px;
  border-radius: 4px;
  margin-right: 4px;
}
.empty {
  padding: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--c-mute);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
