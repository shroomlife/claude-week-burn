/**
 * burn-rate-gh-proxy v2
 *
 * Stateless OAuth token-exchange relay for GitHub's web application flow
 * with PKCE. The SPA cannot talk to github.com/login/oauth/access_token
 * directly because (a) that endpoint has no CORS, and (b) GitHub still
 * requires the client_secret on every token exchange — even with PKCE —
 * so the secret has to live somewhere the browser can't see.
 *
 * This Worker holds GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET as encrypted
 * environment secrets, injects them into the GitHub call, and reflects
 * the response with CORS headers for our allowlisted origins.
 *
 * Endpoints:
 *   POST /token  →  proxies the code exchange to GitHub
 *
 * Everything else returns 404. No state, no logs, no DB, no observability.
 */

interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}

const ALLOWED_ORIGINS = new Set([
  'https://shroomlife.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
])

const ALLOWED_REDIRECT_URIS = new Set([
  'https://shroomlife.github.io/claude-week-burn/',
  'http://localhost:5173/',
  'http://localhost:4173/',
])

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://shroomlife.github.io'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const origin = req.headers.get('Origin')

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (url.pathname !== '/token' || req.method !== 'POST') {
      return json(404, { error: 'not_found' }, origin)
    }

    let payload: { code?: string; code_verifier?: string; redirect_uri?: string } = {}
    try {
      payload = (await req.json()) as typeof payload
    } catch {
      return json(400, { error: 'bad_request' }, origin)
    }

    const { code, code_verifier, redirect_uri } = payload
    if (!code || !code_verifier || !redirect_uri) {
      return json(400, { error: 'missing_params' }, origin)
    }
    if (!ALLOWED_REDIRECT_URIS.has(redirect_uri)) {
      return json(400, { error: 'bad_redirect_uri' }, origin)
    }
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return json(500, { error: 'server_misconfigured' }, origin)
    }

    const ghBody = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier,
      redirect_uri,
    }).toString()

    const ghReq = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'burn-rate-gh-proxy/2.0',
      },
      body: ghBody,
    })

    const text = await ghReq.text()
    return new Response(text, {
      status: ghReq.status,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'application/json',
      },
    })
  },
}
