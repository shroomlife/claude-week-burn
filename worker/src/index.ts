/**
 * burn-rate-gh-proxy
 *
 * Stateless CORS reverse-proxy for GitHub's OAuth Device Flow endpoints.
 * The browser cannot call github.com/login/* directly because GitHub's
 * OAuth endpoints don't send CORS headers. This worker re-issues those two
 * requests server-side and returns them with proper CORS so the SPA can
 * complete a Device Flow without any backend of its own.
 *
 * Endpoints:
 *   POST /login/device/code        → proxies to github.com/login/device/code
 *   POST /login/oauth/access_token → proxies to github.com/login/oauth/access_token
 *
 * Everything else returns 404. No state, no logs, no DB.
 */

const ALLOWED_PATHS = new Set([
  '/login/device/code',
  '/login/oauth/access_token',
])

const ALLOWED_ORIGINS = new Set([
  'https://shroomlife.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
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

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const origin = req.headers.get('Origin')

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (!ALLOWED_PATHS.has(url.pathname) || req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    let body: string
    try {
      body = await req.text()
    } catch {
      return new Response(JSON.stringify({ error: 'bad_request' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    const target = `https://github.com${url.pathname}`
    const ghReq = await fetch(target, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'burn-rate-gh-proxy/1.0',
      },
      body,
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
