import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { usePersistedState } from './usePersistedState'
import { GH_CLIENT_ID, GH_PROXY_URL, GH_SCOPES } from '../config/auth'

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

export interface DeviceFlowChallenge {
  userCode: string
  verificationUri: string
  verificationUriComplete: string
  expiresAt: number
}

export type DeviceFlowPhase = 'idle' | 'requesting' | 'awaiting-user' | 'success' | 'error'

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval: number
}

interface TokenSuccessResponse {
  access_token: string
  token_type: string
  scope: string
}

interface TokenErrorResponse {
  error: string
  error_description?: string
  interval?: number
}

const TOKEN_STORAGE_KEY = 'burnRate:gh:token'

const token = usePersistedState<string | null>(TOKEN_STORAGE_KEY, null, {
  version: 1,
  validate: (v) => (typeof v === 'string' && v.length > 0 ? v : null),
})

const user = ref<GitHubUser | null>(null)
const phase = ref<DeviceFlowPhase>('idle')
const challenge = ref<DeviceFlowChallenge | null>(null)
const errorMessage = ref<string | null>(null)
/**
 * Generation counter so that cancelling a flow mid-poll and immediately
 * starting a new one doesn't leave the previous poll loop racing alongside.
 * Each flow captures its own generation; the loop bails as soon as the
 * shared counter advances.
 */
let pollGeneration = 0
let userFetched = false

function form(body: Record<string, string>): string {
  return new URLSearchParams(body).toString()
}

async function postProxy<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${GH_PROXY_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form(body),
  })
  const data = (await res.json()) as T
  if (!res.ok && !(data as { error?: string }).error) {
    throw new Error(`HTTP ${res.status}`)
  }
  return data
}

async function fetchCurrentUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`user fetch failed: ${res.status}`)
  return (await res.json()) as GitHubUser
}

async function loadUserOnce(): Promise<void> {
  if (userFetched || !token.value) return
  try {
    user.value = await fetchCurrentUser(token.value)
    userFetched = true
  } catch (err) {
    console.warn('[auth] failed to load user — token may be invalid', err)
    token.value = null
  }
}

function logout(): void {
  token.value = null
  user.value = null
  userFetched = false
  phase.value = 'idle'
  challenge.value = null
  errorMessage.value = null
}

async function pollForToken(
  deviceCode: string,
  intervalMs: number,
  expiresAt: number,
  ownGeneration: number,
): Promise<string> {
  let cadence = intervalMs
  // GitHub allows a +5s grace per slow_down
  while (Date.now() < expiresAt) {
    await new Promise((r) => setTimeout(r, cadence))
    if (ownGeneration !== pollGeneration) throw new Error('cancelled')
    const data = await postProxy<TokenSuccessResponse | TokenErrorResponse>('/login/oauth/access_token', {
      client_id: GH_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })
    if (ownGeneration !== pollGeneration) throw new Error('cancelled')
    if ('access_token' in data && data.access_token) return data.access_token

    const err = (data as TokenErrorResponse).error
    if (err === 'authorization_pending') continue
    if (err === 'slow_down') {
      cadence += 5000
      continue
    }
    if (err === 'expired_token') throw new Error('Der Code ist abgelaufen. Bitte neu starten.')
    if (err === 'access_denied') throw new Error('Zugriff verweigert.')
    if (err === 'device_flow_disabled') throw new Error('Device Flow ist in der OAuth-App nicht aktiviert.')
    throw new Error(err || 'Unbekannter Fehler beim Polling.')
  }
  throw new Error('Code abgelaufen. Bitte neu starten.')
}

async function startDeviceFlow(): Promise<void> {
  if (!GH_CLIENT_ID) {
    errorMessage.value = 'Kein VITE_GITHUB_CLIENT_ID konfiguriert.'
    phase.value = 'error'
    return
  }
  errorMessage.value = null
  challenge.value = null
  phase.value = 'requesting'
  // Advance the generation BEFORE starting so any in-flight previous poll
  // sees the change and bails on its next iteration.
  pollGeneration += 1
  const ownGeneration = pollGeneration
  try {
    const code = await postProxy<DeviceCodeResponse>('/login/device/code', {
      client_id: GH_CLIENT_ID,
      scope: GH_SCOPES,
    })
    if (ownGeneration !== pollGeneration) return
    const expiresAt = Date.now() + code.expires_in * 1000
    challenge.value = {
      userCode: code.user_code,
      verificationUri: code.verification_uri,
      verificationUriComplete: code.verification_uri_complete ?? `${code.verification_uri}?user_code=${code.user_code}`,
      expiresAt,
    }
    phase.value = 'awaiting-user'

    const accessToken = await pollForToken(code.device_code, code.interval * 1000, expiresAt, ownGeneration)
    if (ownGeneration !== pollGeneration) return
    token.value = accessToken
    user.value = await fetchCurrentUser(accessToken)
    userFetched = true
    phase.value = 'success'
    challenge.value = null
  } catch (err) {
    if (ownGeneration !== pollGeneration) return
    if ((err as Error).message === 'cancelled') {
      phase.value = 'idle'
      return
    }
    errorMessage.value = (err as Error).message
    phase.value = 'error'
  }
}

function cancelDeviceFlow(): void {
  pollGeneration += 1
  phase.value = 'idle'
  challenge.value = null
}

void loadUserOnce()

export interface AuthApi {
  token: Ref<string | null>
  user: Ref<GitHubUser | null>
  phase: Ref<DeviceFlowPhase>
  challenge: Ref<DeviceFlowChallenge | null>
  errorMessage: Ref<string | null>
  isAuthenticated: ComputedRef<boolean>
  startDeviceFlow: () => Promise<void>
  cancelDeviceFlow: () => void
  logout: () => void
}

export function useGitHubAuth(): AuthApi {
  return {
    token,
    user,
    phase,
    challenge,
    errorMessage,
    isAuthenticated: computed(() => Boolean(token.value && user.value)),
    startDeviceFlow,
    cancelDeviceFlow,
    logout,
  }
}
