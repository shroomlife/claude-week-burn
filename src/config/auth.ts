/**
 * GitHub OAuth + sync configuration.
 *
 * Wire up via env vars (see `.env.example`). Both can be set as GH Actions
 * secrets and injected at build time. Without VITE_GITHUB_CLIENT_ID set the
 * "Sign in with GitHub" affordance is hidden — the app stays localStorage-only.
 */

export const GH_CLIENT_ID: string =
  (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined) ?? ''

export const GH_PROXY_URL: string =
  ((import.meta.env.VITE_GH_PROXY_URL as string | undefined) ?? 'https://burn-rate-gh-proxy.shroomlife.workers.dev').replace(/\/+$/, '')

export const GH_SCOPES = 'gist'

export const GIST_FILENAME = 'claude-burn-rate-state.json'
export const GIST_DESCRIPTION = 'Claude Burn Rate sync (https://shroomlife.github.io/claude-week-burn/)'

export const AUTH_ENABLED = GH_CLIENT_ID.length > 0
