import { computed, nextTick, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { GIST_DESCRIPTION, GIST_FILENAME } from '../config/auth'
import { _persistedBurnState } from './useBurnState'
import { useGitHubAuth } from './useGitHubAuth'
import { usePersistedState } from './usePersistedState'
import type { PersistedDataV1 } from '../types/burn'

/**
 * Sync state machine
 *   off            — not authenticated, nothing happens
 *   bootstrapping  — auth flipped to true, about to run initial pull
 *   pulling        — pull request in flight (initial or refresh)
 *   pushing        — push request in flight
 *   idle           — synced, ready for next event
 *   error          — last op failed; will retry on next event
 *
 * Invariants:
 *   - Push is GATED by `initialPullDone`. Until the very first pull finishes
 *     successfully, no local change is allowed to escape to the gist. This
 *     prevents the classic "fresh device login pushes empty state on top of
 *     real remote" foot-gun.
 *   - When `pull()` writes to `_persistedBurnState`, it flips `applyingRemote`
 *     so the push-watch ignores that write — otherwise pull→watch→push would
 *     loop and stamp the gist with new updatedAt for no reason.
 *   - Conflict resolution is hash-based, not timestamp-tolerance based:
 *     equal canonical hash = no real change, skip the write.
 */
export type SyncStatus = 'off' | 'bootstrapping' | 'pulling' | 'pushing' | 'idle' | 'error'

interface GistPayloadV1 {
  v: 1
  app: 'claude-burn-rate'
  updatedAt: string
  state: PersistedDataV1
}

interface GistFile {
  content?: string
  truncated?: boolean
  raw_url?: string
}

interface GistResponse {
  id: string
  description: string | null
  updated_at: string
  files: Record<string, GistFile>
}

const GIST_KEY_ID = 'burnRate:gh:gistId'
const GIST_KEY_SYNCED_AT = 'burnRate:gh:lastSyncedAt'
const GIST_KEY_SYNCED_HASH = 'burnRate:gh:lastSyncedHash'
const GIST_KEY_DIRTY = 'burnRate:gh:dirty'

const gistId = usePersistedState<string | null>(GIST_KEY_ID, null, {
  version: 1,
  validate: (v) => (typeof v === 'string' && v.length > 0 ? v : null),
})

/** ISO timestamp of the last gist payload we successfully read or wrote. */
const lastSyncedAt = usePersistedState<string | null>(GIST_KEY_SYNCED_AT, null, {
  version: 1,
  validate: (v) => (typeof v === 'string' && v.length > 0 ? v : null),
})

/** SHA-256 hash (base64url) of the last state we successfully synced. */
const lastSyncedHash = usePersistedState<string | null>(GIST_KEY_SYNCED_HASH, null, {
  version: 1,
  validate: (v) => (typeof v === 'string' && v.length > 0 ? v : null),
})

/**
 * True if local state has diverged from `lastSyncedHash` and hasn't been pushed yet.
 * Persisted so a tab close mid-debounce doesn't lose the "I owe a push" intent.
 */
const isDirty = usePersistedState<boolean>(GIST_KEY_DIRTY, false, {
  version: 1,
  validate: (v) => (typeof v === 'boolean' ? v : false),
})

const status = ref<SyncStatus>('off')
const errorMessage = ref<string | null>(null)
const initialPullDone = ref(false)

/**
 * Set to true ONLY while `pull()` is writing remote state into local. The
 * push-watch ignores changes that arrive while this is true, breaking the
 * pull→watch→push echo loop.
 */
let applyingRemote = false

const auth = useGitHubAuth()

function log(...args: unknown[]): void {
  if (typeof console !== 'undefined' && console.debug) console.debug('[sync]', ...args)
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let s = ''
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i] as number)
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/**
 * Canonical hash of a state for content-based conflict detection.
 * `lastSeen` is excluded — it's local UX telemetry, not real data,
 * and including it would flag every interaction as "dirty".
 */
async function canonicalHash(s: PersistedDataV1): Promise<string> {
  const canonical = JSON.stringify({
    resetDate: s.resetDate,
    usagePercent: s.usagePercent,
    setupComplete: s.setupComplete,
  })
  const enc = new TextEncoder().encode(canonical)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return base64urlEncode(buf)
}

function buildPayload(state: PersistedDataV1): GistPayloadV1 {
  return {
    v: 1,
    app: 'claude-burn-rate',
    updatedAt: new Date().toISOString(),
    state,
  }
}

async function findOurGist(token: string): Promise<string | null> {
  const PAGE_SIZE = 100
  const MAX_PAGES = 50
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await fetch(
      `https://api.github.com/gists?per_page=${PAGE_SIZE}&page=${page}`,
      { headers: authHeaders(token) },
    )
    if (!res.ok) throw new Error(`gist list failed: ${res.status}`)
    const data = (await res.json()) as GistResponse[]
    const match = data.find(
      (g) =>
        g.description === GIST_DESCRIPTION &&
        Object.prototype.hasOwnProperty.call(g.files, GIST_FILENAME),
    )
    if (match) return match.id
    if (data.length < PAGE_SIZE) return null
  }
  return null
}

async function readGistContent(token: string, id: string): Promise<GistPayloadV1 | null> {
  const res = await fetch(`https://api.github.com/gists/${id}`, { headers: authHeaders(token) })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`gist read failed: ${res.status}`)
  }
  const data = (await res.json()) as GistResponse
  const file = data.files[GIST_FILENAME]
  if (!file) return null
  let raw = file.content
  if (file.truncated && file.raw_url) {
    const rawUrl = new URL(file.raw_url)
    if (rawUrl.hostname !== 'gist.githubusercontent.com') {
      throw new Error(`unexpected raw_url host: ${rawUrl.hostname}`)
    }
    const r = await fetch(file.raw_url, { headers: authHeaders(token) })
    if (!r.ok) throw new Error(`gist raw fetch failed: ${r.status}`)
    raw = await r.text()
  }
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      (parsed as GistPayloadV1).v === 1 &&
      (parsed as GistPayloadV1).app === 'claude-burn-rate' &&
      typeof (parsed as GistPayloadV1).updatedAt === 'string' &&
      typeof (parsed as GistPayloadV1).state === 'object'
    ) {
      return parsed as GistPayloadV1
    }
    return null
  } catch {
    return null
  }
}

async function createGist(token: string, payload: GistPayloadV1): Promise<string> {
  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } },
    }),
  })
  if (!res.ok) throw new Error(`gist create failed: ${res.status}`)
  const data = (await res.json()) as GistResponse
  return data.id
}

async function updateGist(token: string, id: string, payload: GistPayloadV1): Promise<void> {
  const res = await fetch(`https://api.github.com/gists/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } },
    }),
  })
  if (!res.ok) throw new Error(`gist update failed: ${res.status}`)
}

interface EnsureResult {
  id: string
  /** True if we just created the gist (= local was the source of truth). */
  created: boolean
}

async function ensureGist(token: string): Promise<EnsureResult> {
  if (gistId.value) return { id: gistId.value, created: false }

  const found = await findOurGist(token)
  if (found) {
    gistId.value = found
    return { id: found, created: false }
  }

  // Nothing remote — upload current local as the canonical state.
  const payload = buildPayload(_persistedBurnState.value)
  const newId = await createGist(token, payload)
  gistId.value = newId
  lastSyncedAt.value = payload.updatedAt
  lastSyncedHash.value = await canonicalHash(payload.state)
  isDirty.value = false
  log('created new gist', newId)
  return { id: newId, created: true }
}

/**
 * Write remote state into local, suppressing the push-watch echo. The flag
 * is cleared in nextTick — Vue's default watcher flush is the post-update
 * pass, so by then the watch will have fired and read `applyingRemote = true`.
 */
async function applyRemoteState(s: PersistedDataV1): Promise<void> {
  applyingRemote = true
  _persistedBurnState.value = s
  await nextTick()
  applyingRemote = false
}

function isAuthError(err: unknown): boolean {
  const msg = (err as Error | undefined)?.message ?? ''
  return msg.includes('401') || msg.includes('403')
}

function handleError(err: unknown): void {
  log('error', err)
  if (isAuthError(err)) {
    // Self-heal: stale/revoked token → wipe sync state, log out cleanly.
    console.warn('[sync] auth error — logging out', err)
    auth.logout()
    teardown()
    return
  }
  errorMessage.value = (err as Error).message
  status.value = 'error'
}

function teardown(): void {
  status.value = 'off'
  initialPullDone.value = false
  gistId.value = null
  lastSyncedAt.value = null
  lastSyncedHash.value = null
  isDirty.value = false
  errorMessage.value = null
  log('teardown')
}

/**
 * Initial pull triggered by auth flipping true. Single source of "fresh login"
 * semantics: remote ALWAYS wins iff `consumeJustLoggedIn()` returns true.
 *
 * On boot-with-stored-token (page reload while already authenticated),
 * `justLoggedIn` is false → falls through to hash-based reconciliation.
 */
async function bootstrap(): Promise<void> {
  if (!auth.token.value) return
  if (status.value === 'pulling' || status.value === 'pushing') return
  log('bootstrap', { freshLogin: 'pending' })
  status.value = 'bootstrapping'
  errorMessage.value = null
  await runPull({ initial: true })
}

interface PullOptions {
  initial?: boolean
}

async function runPull({ initial = false }: PullOptions = {}): Promise<void> {
  const token = auth.token.value
  if (!token) return
  // Don't interrupt an in-flight push; visibilitychange triggers can wait.
  if (status.value === 'pushing') return
  if (status.value === 'pulling') return
  status.value = 'pulling'
  errorMessage.value = null

  try {
    const { id, created } = await ensureGist(token)
    // We just created the gist FROM local state — there's nothing to pull.
    if (created) {
      initialPullDone.value = true
      status.value = 'idle'
      log('initial: created remote from local')
      // Consume the fresh-login flag even though no overwrite happened —
      // semantically the login has been "processed".
      if (initial) auth.consumeJustLoggedIn()
      return
    }

    const remote = await readGistContent(token, id)
    const isFreshLogin = initial && auth.consumeJustLoggedIn()
    log('pull', { initial, isFreshLogin, hasRemote: Boolean(remote) })

    if (!remote) {
      // Gist exists but its payload is invalid/empty — recreate.
      const payload = buildPayload(_persistedBurnState.value)
      await updateGist(token, id, payload)
      lastSyncedAt.value = payload.updatedAt
      lastSyncedHash.value = await canonicalHash(payload.state)
      isDirty.value = false
      initialPullDone.value = true
      status.value = 'idle'
      log('initial: gist was empty, refilled from local')
      return
    }

    const remoteHash = await canonicalHash(remote.state)
    const localHash = await canonicalHash(_persistedBurnState.value)

    if (isFreshLogin) {
      // Documented UX: fresh login = remote wins, unconditional.
      // This is what the user invoked the OAuth flow FOR.
      await applyRemoteState(remote.state)
      lastSyncedAt.value = remote.updatedAt
      lastSyncedHash.value = remoteHash
      isDirty.value = false
      log('fresh login → applied remote', { remoteHash })
    } else if (remoteHash === localHash) {
      // Identical content — just sync the bookkeeping.
      lastSyncedAt.value = remote.updatedAt
      lastSyncedHash.value = remoteHash
      isDirty.value = false
      log('pull: identical, bookkeeping only')
    } else if (lastSyncedHash.value && remoteHash === lastSyncedHash.value) {
      // Remote unchanged since our last sync → local is ahead. Push will follow.
      log('pull: remote unchanged, local ahead — will push')
      if (!isDirty.value) isDirty.value = true
    } else if (!isDirty.value || localHash === lastSyncedHash.value) {
      // Local is clean (or matches last sync) but remote moved → take remote.
      await applyRemoteState(remote.state)
      lastSyncedAt.value = remote.updatedAt
      lastSyncedHash.value = remoteHash
      isDirty.value = false
      log('pull: remote newer, local clean → applied remote')
    } else {
      // Both diverged since last sync = real conflict. Document UX is
      // last-write-wins favoring remote (matches the fresh-login rule).
      // We still apply remote, but loud-log so it's visible.
      console.warn('[sync] conflict: both local and remote changed since last sync — remote wins')
      await applyRemoteState(remote.state)
      lastSyncedAt.value = remote.updatedAt
      lastSyncedHash.value = remoteHash
      isDirty.value = false
    }

    initialPullDone.value = true
    status.value = 'idle'
  } catch (err) {
    handleError(err)
  }
}

async function runPush(): Promise<void> {
  const token = auth.token.value
  if (!token) return
  if (!initialPullDone.value) {
    // GATE: never push before the initial pull confirms remote is consistent.
    log('push: blocked — initial pull not done')
    return
  }
  if (status.value === 'pulling' || status.value === 'pushing') return

  const localHash = await canonicalHash(_persistedBurnState.value)
  if (localHash === lastSyncedHash.value) {
    // Nothing meaningful changed. Critical for the "watch fires on remote
    // apply → debounced push echoes remote back" loop the old code had.
    isDirty.value = false
    log('push: skipped (hash unchanged)')
    return
  }

  status.value = 'pushing'
  errorMessage.value = null
  try {
    const { id } = await ensureGist(token)
    const payload = buildPayload(_persistedBurnState.value)
    await updateGist(token, id, payload)
    lastSyncedAt.value = payload.updatedAt
    lastSyncedHash.value = await canonicalHash(payload.state)
    isDirty.value = false
    status.value = 'idle'
    log('push: ok', { newHash: lastSyncedHash.value })
  } catch (err) {
    handleError(err)
  }
}

const pushDebounced = useDebounceFn(runPush, 1500)

// === Wiring ================================================================

// Auth lifecycle
watch(
  () => auth.isAuthenticated.value,
  (yes, was) => {
    if (yes && !was) {
      void bootstrap()
    } else if (!yes && was) {
      teardown()
    }
  },
  { immediate: true },
)

// Local change → mark dirty + push (gated, hash-checked).
watch(
  () => _persistedBurnState.value,
  () => {
    if (applyingRemote) return
    if (!auth.isAuthenticated.value) return
    if (!initialPullDone.value) return
    isDirty.value = true
    void pushDebounced()
  },
  { deep: true },
)

// Refresh on tab return — only after initial pull, never during another op.
useEventListener(document, 'visibilitychange', () => {
  if (document.hidden) return
  if (!auth.isAuthenticated.value) return
  if (!initialPullDone.value) return
  void runPull()
})

// If we returned online with a pending dirty state, try to push.
useEventListener(window, 'online', () => {
  if (!auth.isAuthenticated.value) return
  if (!initialPullDone.value) return
  if (isDirty.value) void runPush()
})

export interface SyncApi {
  status: Ref<SyncStatus>
  lastSyncedAt: Ref<string | null>
  isDirty: Ref<boolean>
  errorMessage: Ref<string | null>
  gistId: Ref<string | null>
  initialPullDone: Ref<boolean>
  isReady: ComputedRef<boolean>
  pullNow: () => Promise<void>
  pushNow: () => Promise<void>
}

export function useGistSync(): SyncApi {
  return {
    status,
    lastSyncedAt,
    isDirty,
    errorMessage,
    gistId,
    initialPullDone,
    isReady: computed(() => status.value !== 'off' && auth.isAuthenticated.value),
    pullNow: () => runPull(),
    pushNow: runPush,
  }
}
