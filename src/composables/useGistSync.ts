import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { GIST_DESCRIPTION, GIST_FILENAME } from '../config/auth'
import { _persistedBurnState } from './useBurnState'
import { useGitHubAuth } from './useGitHubAuth'
import { usePersistedState } from './usePersistedState'
import type { PersistedDataV1 } from '../types/burn'

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error'

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

const gistId = usePersistedState<string | null>('burnRate:gh:gistId', null, {
  version: 1,
  validate: (v) => (typeof v === 'string' && v.length > 0 ? v : null),
})

/** ISO timestamp of the last successful push payload — drives conflict resolution. */
const lastSyncedAt = usePersistedState<string | null>('burnRate:gh:lastSyncedAt', null, {
  version: 1,
  validate: (v) => (typeof v === 'string' && v.length > 0 ? v : null),
})

const status = ref<SyncStatus>('off')
const errorMessage = ref<string | null>(null)

const auth = useGitHubAuth()

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** Walks pages until the marker gist is found or the listing is exhausted. */
async function findOurGist(token: string): Promise<string | null> {
  const PAGE_SIZE = 100
  const MAX_PAGES = 50 // 5000 gists, more than anyone should have
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

function buildPayload(state: PersistedDataV1): GistPayloadV1 {
  return {
    v: 1,
    app: 'claude-burn-rate',
    updatedAt: new Date().toISOString(),
    state,
  }
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
    // Defense in depth: the bearer token gets sent on this fetch; only trust
    // GitHub's canonical raw host. If the API response is ever tampered with,
    // we refuse rather than leak the token to an arbitrary origin.
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

async function ensureGist(token: string): Promise<string> {
  if (gistId.value) return gistId.value
  const found = await findOurGist(token)
  if (found) {
    gistId.value = found
    return found
  }
  const payload = buildPayload(_persistedBurnState.value)
  const newId = await createGist(token, payload)
  gistId.value = newId
  lastSyncedAt.value = payload.updatedAt
  return newId
}

/** Returns true if the error looks like an auth failure (revoked / expired). */
function isAuthError(err: unknown): boolean {
  const msg = (err as Error | undefined)?.message ?? ''
  return msg.includes('401') || msg.includes('403')
}

async function pull(): Promise<void> {
  const token = auth.token.value
  if (!token) return
  if (status.value === 'syncing') return
  errorMessage.value = null
  status.value = 'syncing'
  try {
    const id = await ensureGist(token)
    const remote = await readGistContent(token, id)
    if (remote) {
      const remoteTs = new Date(remote.updatedAt).getTime()
      // Compare against our last successful push timestamp, NOT lastSeen (which
      // is user-interaction time and unrelated to sync). On a fresh device
      // lastSyncedAt is null → remote always wins (it's the canonical state).
      const localTs = lastSyncedAt.value ? new Date(lastSyncedAt.value).getTime() : 0
      if (Number.isFinite(remoteTs) && remoteTs > localTs + 500) {
        _persistedBurnState.value = remote.state
        lastSyncedAt.value = remote.updatedAt
      }
    }
    status.value = 'idle'
  } catch (err) {
    if (isAuthError(err)) {
      // Revoked / expired — self-heal so the user can sign in again cleanly.
      console.warn('[gist-sync] auth error, logging out', err)
      auth.logout()
      gistId.value = null
      lastSyncedAt.value = null
      status.value = 'off'
      return
    }
    errorMessage.value = (err as Error).message
    status.value = 'error'
  }
}

async function push(): Promise<void> {
  const token = auth.token.value
  if (!token) return
  errorMessage.value = null
  status.value = 'syncing'
  try {
    const id = await ensureGist(token)
    const payload = buildPayload(_persistedBurnState.value)
    await updateGist(token, id, payload)
    lastSyncedAt.value = payload.updatedAt
    status.value = 'idle'
  } catch (err) {
    if (isAuthError(err)) {
      console.warn('[gist-sync] auth error, logging out', err)
      auth.logout()
      gistId.value = null
      lastSyncedAt.value = null
      status.value = 'off'
      return
    }
    errorMessage.value = (err as Error).message
    status.value = 'error'
  }
}

const pushDebounced = useDebounceFn(push, 3000)

watch(
  () => auth.isAuthenticated.value,
  (yes, was) => {
    if (yes && !was) {
      status.value = 'idle'
      void pull()
    } else if (!yes && was) {
      status.value = 'off'
      // Clear gist pointer + sync timestamp so a future login on the same
      // device starts clean (find or create logic re-runs).
      gistId.value = null
      lastSyncedAt.value = null
    }
  },
  { immediate: true },
)

watch(
  () => _persistedBurnState.value,
  () => {
    if (auth.isAuthenticated.value) void pushDebounced()
  },
  { deep: true },
)

useEventListener(document, 'visibilitychange', () => {
  if (!document.hidden && auth.isAuthenticated.value) void pull()
})

export interface SyncApi {
  status: Ref<SyncStatus>
  lastSyncedAt: Ref<string | null>
  errorMessage: Ref<string | null>
  gistId: Ref<string | null>
  isReady: ComputedRef<boolean>
  pullNow: () => Promise<void>
  pushNow: () => Promise<void>
}

export function useGistSync(): SyncApi {
  return {
    status,
    lastSyncedAt,
    errorMessage,
    gistId,
    isReady: computed(() => status.value !== 'off' && auth.isAuthenticated.value),
    pullNow: pull,
    pushNow: push,
  }
}
