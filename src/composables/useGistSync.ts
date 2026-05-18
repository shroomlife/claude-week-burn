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

const status = ref<SyncStatus>('off')
const lastSyncedAt = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const auth = useGitHubAuth()

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function listOwnedGists(token: string): Promise<GistResponse[]> {
  const res = await fetch('https://api.github.com/gists?per_page=100', {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`gist list failed: ${res.status}`)
  return (await res.json()) as GistResponse[]
}

async function findOurGist(token: string): Promise<string | null> {
  const list = await listOwnedGists(token)
  const match = list.find(
    (g) => g.description === GIST_DESCRIPTION && Object.prototype.hasOwnProperty.call(g.files, GIST_FILENAME),
  )
  return match ? match.id : null
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
    const r = await fetch(file.raw_url, { headers: authHeaders(token) })
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
  const newId = await createGist(token, buildPayload(_persistedBurnState.value))
  gistId.value = newId
  return newId
}

async function pull(): Promise<void> {
  if (!auth.token.value) return
  if (status.value === 'syncing') return
  errorMessage.value = null
  status.value = 'syncing'
  try {
    const id = await ensureGist(auth.token.value)
    const remote = await readGistContent(auth.token.value, id)
    if (remote) {
      const remoteTs = new Date(remote.updatedAt).getTime()
      const localTs = new Date(_persistedBurnState.value.lastSeen).getTime()
      if (Number.isFinite(remoteTs) && remoteTs > localTs + 500) {
        _persistedBurnState.value = remote.state
      }
    }
    lastSyncedAt.value = new Date().toISOString()
    status.value = 'idle'
  } catch (err) {
    errorMessage.value = (err as Error).message
    status.value = 'error'
  }
}

async function push(): Promise<void> {
  if (!auth.token.value) return
  errorMessage.value = null
  status.value = 'syncing'
  try {
    const id = await ensureGist(auth.token.value)
    await updateGist(auth.token.value, id, buildPayload(_persistedBurnState.value))
    lastSyncedAt.value = new Date().toISOString()
    status.value = 'idle'
  } catch (err) {
    errorMessage.value = (err as Error).message
    status.value = 'error'
  }
}

const pushDebounced = useDebounceFn(push, 3000)

// Reactive wiring — only when authenticated.
watch(
  () => auth.isAuthenticated.value,
  (yes, was) => {
    if (yes && !was) {
      status.value = 'idle'
      void pull()
    } else if (!yes && was) {
      status.value = 'off'
      gistId.value = null
      lastSyncedAt.value = null
    }
  },
  { immediate: true },
)

// Push on state change while authenticated
watch(
  () => _persistedBurnState.value,
  () => {
    if (auth.isAuthenticated.value) void pushDebounced()
  },
  { deep: true },
)

// Pull when the tab becomes visible again
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
