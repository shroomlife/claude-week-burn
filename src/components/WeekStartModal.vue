<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconClose from '~icons/ph/x-bold'
import IconCalendar from '~icons/ph/calendar-blank'
import DatePicker from './DatePicker.vue'

const props = defineProps<{
  open: boolean
  /** Currently active week start (override OR auto-derived). */
  current: string
  /** Local ISO of the auto-derived value (resetDate - 7d). Shown as info. */
  autoDerived: string
  /** Whether the current value is an explicit override. */
  isOverride: boolean
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', value: string | null): void
}>()

const value = ref<string>(props.current)
const useAuto = ref<boolean>(!props.isOverride)

watch(() => props.open, (open) => {
  if (!open) return
  value.value = props.current
  useAuto.value = !props.isOverride
})

watch(value, (v) => {
  // Manually changing the date implies the user wants an override.
  if (v !== props.autoDerived) useAuto.value = false
})

const autoPretty = computed(() => {
  const d = new Date(props.autoDerived)
  if (!Number.isFinite(d.getTime())) return props.autoDerived
  return d.toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
})

function pickAuto(): void {
  useAuto.value = true
  value.value = props.autoDerived
}

function cancel(): void { emit('cancel') }
function save(): void {
  if (useAuto.value) emit('save', null)
  else emit('save', value.value)
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') cancel()
}
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="dlg-backdrop" @click.self="cancel" @keydown="onKey">
      <transition name="card">
        <div v-if="open" class="dlg" role="dialog" aria-modal="true" aria-labelledby="ws-dlg-title">
          <header class="dlg-head">
            <div class="head-text">
              <h2 id="ws-dlg-title"><IconCalendar class="head-icon" /> {{ $t('weekStart.title') }}</h2>
              <p>{{ $t('weekStart.subtitle') }}</p>
            </div>
            <button type="button" class="close" :aria-label="$t('weekStart.cancel')" @click="cancel">
              <IconClose />
            </button>
          </header>

          <div class="body">
            <DatePicker v-model="value" />
            <button
              type="button"
              class="auto-row"
              :aria-pressed="useAuto"
              :class="{ active: useAuto }"
              @click="pickAuto"
            >
              <span class="auto-label">{{ $t('weekStart.useAuto') }}</span>
              <span class="auto-pretty num">{{ autoPretty }}</span>
            </button>
          </div>

          <footer class="dlg-foot">
            <button type="button" class="btn ghost" @click="cancel">{{ $t('weekStart.cancel') }}</button>
            <button type="button" class="btn primary" @click="save">{{ $t('weekStart.save') }}</button>
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
  width: min(440px, 100%);
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

.body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }

.auto-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  background: transparent;
  border: 1px solid var(--c-hair);
  border-radius: var(--r-card-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.auto-row:hover { background: rgba(15, 23, 42, 0.03); }
.auto-row.active {
  background: rgba(234, 88, 12, 0.08);
  border-color: rgba(234, 88, 12, 0.4);
}
.auto-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--c-ink-soft);
  letter-spacing: -0.005em;
}
.auto-row.active .auto-label { color: var(--c-flame-2); }
.auto-pretty {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--c-mute);
  letter-spacing: -0.02em;
}

.dlg-foot {
  display: flex;
  gap: 8px;
  padding: 12px 18px 18px;
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
}
</style>
