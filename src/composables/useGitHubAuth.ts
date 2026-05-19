import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { usePersistedState } from './usePersistedState'
import { GH_CLIENT_ID, GH_PROXY_URL, GH_SCOPES } from '../config/auth'

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

export type AuthPhase = 'idle' | 'redirecting' | 'exchanging' | 'success' | 'error'

interface TokenSuccessResponse {
  access_token: string
  token_type: string
  scope: string
}

interface TokenErrorResponse {
  error: string
  error_description?: string
  error_uri?: string
}

const TOKEN_STORAGE_KEY = 'burnRate:gh:token'
const SESSION_VERIFIER_KEY = 'burnRate:gh:pkce_verifier'
const SESSION_STATE_KEY = 'burnRate:gh:oauth_state'

const token = usePersistedState<string | null>(TOKEN_STORAGE_KEY, null, {
  version: 1,
  validate: (v) => (typeof v === 'string' && v.length > 0 ? v : null),
})

const user = ref<GitHubUser | null>(null)
const phase = ref<AuthPhase>('idle')
const errorMessage = ref<string | null>(null)
let userFetched = false

/**
 * Set to true exactly once, right after a fresh successful login completes.
 * The sync layer reads + consumes this so it knows to *overwrite* local state
 * with the remote gist on first pull (instead of doing the normal timestamp-
 * based last-write-wins resolution). Boot-with-existing-token does not flip
 * this flag.
 */
const justLoggedIn = ref(false)

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (let i = 0; i < bytes.length; i += 1) str += String.fromCharCode(bytes[i] as number)
  return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64urlEncode(bytes.buffer)
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64urlEncode(hash)
}

function redirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`
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
  console.info('[auth] logout')
  // 1. Flip in-memory state — reactivity propagates to UI immediately.
  token.value = null
  user.value = null
  userFetched = false
  phase.value = 'idle'
  errorMessage.value = null
  justLoggedIn.value = false
  // 2. Belt + suspenders: synchronously remove the token from localStorage.
  //    Without this, the debounced write fires ~400ms later — if the user
  //    closes the tab in the window, we relied on the pagehide flush to
  //    write null. With this, the entry is gone IMMEDIATELY.
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    sessionStorage.removeItem(SESSION_VERIFIER_KEY)
    sessionStorage.removeItem(SESSION_STATE_KEY)
  } catch { /* storage may be unavailable */ }
}

async function startLogin(): Promise<void> {
  if (!GH_CLIENT_ID) {
    errorMessage.value = 'Kein VITE_GITHUB_CLIENT_ID konfiguriert.'
    phase.value = 'error'
    return
  }
  errorMessage.value = null
  phase.value = 'redirecting'

  const verifier = randomBase64Url(64)
  const challenge = await sha256Base64Url(verifier)
  const state = randomBase64Url(16)

  try {
    sessionStorage.setItem(SESSION_VERIFIER_KEY, verifier)
    sessionStorage.setItem(SESSION_STATE_KEY, state)
  } catch (err) {
    errorMessage.value = 'sessionStorage nicht verfügbar — Login nicht möglich.'
    phase.value = 'error'
    return
  }

  // allow_signup omitted on purpose — GitHub defaults to true, which is fine
  // for a public tool. Setting it to 'false' just hides GitHub's signup CTA
  // for unauthenticated visitors with no real security benefit.
  const params = new URLSearchParams({
    client_id: GH_CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: GH_SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  window.location.assign(`https://github.com/login/oauth/authorize?${params.toString()}`)
}

async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<string> {
  const res = await fetch(`${GH_PROXY_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri(),
    }),
  })
  const data = (await res.json()) as TokenSuccessResponse | TokenErrorResponse
  if (!res.ok) throw new Error(`proxy /token returned ${res.status}`)
  if ('access_token' in data && data.access_token) return data.access_token
  const err = (data as TokenErrorResponse).error
  if (err === 'access_denied') throw new Error('Zugriff verweigert.')
  if (err === 'bad_redirect_uri') throw new Error('Falsche Redirect-URI im Proxy.')
  if (err === 'server_misconfigured') throw new Error('Worker hat keinen client_secret konfiguriert.')
  throw new Error(
    (data as TokenErrorResponse).error_description ||
    err ||
    'Unbekannter Fehler beim Token-Exchange.',
  )
}

/**
 * Inspects the current URL for an OAuth callback (?code=&state=). If found,
 * validates state, performs the code-for-token exchange via the Worker proxy,
 * stores the token + fetched user, and cleans the URL.
 *
 * Idempotent: safe to call multiple times.
 */
async function handleCallbackOnce(): Promise<void> {
  const search = new URLSearchParams(window.location.search)
  const code = search.get('code')
  const state = search.get('state')
  const oauthError = search.get('error')

  if (oauthError) {
    // GitHub authorize-side errors (docs: troubleshooting-authorization-request-errors)
    if (oauthError === 'application_suspended') {
      errorMessage.value = 'Diese OAuth-App ist gesperrt. Wende dich an support@github.com.'
    } else if (oauthError === 'redirect_uri_mismatch') {
      errorMessage.value = 'Callback-URL stimmt nicht mit der OAuth-App-Konfiguration überein.'
    } else if (oauthError === 'access_denied') {
      errorMessage.value = 'Zugriff verweigert.'
    } else {
      errorMessage.value = search.get('error_description') || oauthError
    }
    phase.value = 'error'
    cleanCallbackParams()
    return
  }
  if (!code || !state) return

  let storedState: string | null = null
  let storedVerifier: string | null = null
  try {
    storedState = sessionStorage.getItem(SESSION_STATE_KEY)
    storedVerifier = sessionStorage.getItem(SESSION_VERIFIER_KEY)
  } catch { /* fallthrough */ }

  cleanCallbackParams()

  if (!storedState || storedState !== state) {
    errorMessage.value = 'State-Parameter stimmt nicht — Login abgebrochen.'
    phase.value = 'error'
    return
  }
  if (!storedVerifier) {
    errorMessage.value = 'code_verifier verloren — bitte erneut versuchen.'
    phase.value = 'error'
    return
  }

  try {
    sessionStorage.removeItem(SESSION_VERIFIER_KEY)
    sessionStorage.removeItem(SESSION_STATE_KEY)
  } catch { /* noop */ }

  phase.value = 'exchanging'
  try {
    const accessToken = await exchangeCodeForToken(code, storedVerifier)
    token.value = accessToken
    user.value = await fetchCurrentUser(accessToken)
    userFetched = true
    justLoggedIn.value = true
    phase.value = 'success'
  } catch (err) {
    errorMessage.value = (err as Error).message
    phase.value = 'error'
  }
}

function cleanCallbackParams(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  url.searchParams.delete('error_uri')
  window.history.replaceState({}, '', url.toString())
}

/** Called by the sync layer once to consume the fresh-login signal. */
function consumeJustLoggedIn(): boolean {
  if (!justLoggedIn.value) return false
  justLoggedIn.value = false
  return true
}

void loadUserOnce()
void handleCallbackOnce()

export interface AuthApi {
  token: Ref<string | null>
  user: Ref<GitHubUser | null>
  phase: Ref<AuthPhase>
  errorMessage: Ref<string | null>
  isAuthenticated: ComputedRef<boolean>
  startLogin: () => Promise<void>
  logout: () => void
  consumeJustLoggedIn: () => boolean
}

export function useGitHubAuth(): AuthApi {
  return {
    token,
    user,
    phase,
    errorMessage,
    isAuthenticated: computed(() => Boolean(token.value && user.value)),
    startLogin,
    logout,
    consumeJustLoggedIn,
  }
}
