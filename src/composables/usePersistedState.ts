import { ref, watch, type Ref } from 'vue'
import { useDebounceFn, useEventListener } from '@vueuse/core'

interface Envelope<T> {
  v: number
  d: T
}

export interface PersistedStateOptions<T> {
  version: number
  migrate?: (raw: unknown, fromVersion: number) => T | null
  /** Optional final clamp/validator before commit. Throw or return null to reject. */
  validate?: (value: T) => T | null
  debounceMs?: number
  storage?: Storage
}

function readEnvelope(storage: Storage, key: string): { v: number; d: unknown } | null {
  try {
    const raw = storage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'v' in parsed &&
      'd' in parsed &&
      typeof (parsed as { v: unknown }).v === 'number'
    ) {
      return parsed as { v: number; d: unknown }
    }
    return null
  } catch {
    return null
  }
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options: PersistedStateOptions<T>,
): Ref<T> {
  const storage: Storage = options.storage ?? globalThis.localStorage
  const debounceMs = options.debounceMs ?? 400

  const initial = ((): T => {
    if (!storage) return defaultValue
    const env = readEnvelope(storage, key)
    if (env === null) return defaultValue
    if (env.v === options.version) {
      const value = env.d as T
      const validated = options.validate ? options.validate(value) : value
      return validated ?? defaultValue
    }
    if (options.migrate) {
      try {
        const migrated = options.migrate(env.d, env.v)
        if (migrated !== null) {
          const validated = options.validate ? options.validate(migrated) : migrated
          return validated ?? defaultValue
        }
      } catch (err) {
        console.warn(`[persisted:${key}] migrate failed`, err)
      }
    } else {
      console.warn(`[persisted:${key}] schema v${env.v} found, expected v${options.version}, falling back to default`)
    }
    return defaultValue
  })()

  const state = ref(initial) as Ref<T>

  const write = (): void => {
    if (!storage) return
    try {
      const envelope: Envelope<T> = { v: options.version, d: state.value }
      storage.setItem(key, JSON.stringify(envelope))
    } catch (err) {
      console.warn(`[persisted:${key}] write failed`, err)
    }
  }

  const debouncedWrite = useDebounceFn(write, debounceMs)

  watch(state, () => { void debouncedWrite() }, { deep: true })

  // Flush on hide/pagehide so we don't lose the last drag value.
  useEventListener(document, 'visibilitychange', () => {
    if (document.hidden) write()
  })
  useEventListener(window, 'pagehide', () => write())

  return state
}
