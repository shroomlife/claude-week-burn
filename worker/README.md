# burn-rate-gh-proxy

Stateless Cloudflare Worker that performs the GitHub OAuth code↔token exchange
for the SPA's web application flow with PKCE.

## Why this exists

GitHub still requires `client_secret` on `POST /login/oauth/access_token`, even
with PKCE. The browser must not see the secret, so this Worker holds it as an
encrypted env binding and injects it server-side. PKCE adds defense-in-depth
on top.

The endpoint also has no CORS, so a browser fetch would fail at preflight.

## Endpoint

| Method | Path | Behavior |
|--------|-------|----------|
| `POST` | `/token` | Forwards `{code, code_verifier, redirect_uri}` plus the env secrets to GitHub, returns the access_token response with CORS headers |
| `OPTIONS` | * | CORS preflight |
| anything else | * | `404 not_found` |

## Allowed origins

Hard-coded allowlist:
- `https://shroomlife.github.io` (production)
- `http://localhost:5173` (Vite dev)
- `http://localhost:4173` (Vite preview)

## Allowed redirect URIs

Hard-coded allowlist (must match exactly, including trailing slash):
- `https://shroomlife.github.io/claude-week-burn/`
- `http://localhost:5173/`
- `http://localhost:4173/`

## Environment variables (encrypted secrets)

Set these as Worker Secrets before deploying:

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

Or via the Cloudflare Dashboard → Workers → burn-rate-gh-proxy → Settings → Variables.

They are stored encrypted at rest and only readable by the Worker runtime.

## Deploy

```bash
bun install -g wrangler
wrangler login
wrangler deploy
```

URL: `https://burn-rate-gh-proxy.shroomlife.workers.dev`

## Observability

Explicitly **disabled** in `wrangler.toml`. The Worker handles token-exchange
traffic; even with bodies not console-logged, no platform telemetry should sit
on this path. Set `observability.enabled = false`.

## Cost

Free tier: 100,000 requests/day. One full login uses 1 request. Cost: 0,00 €/month.
