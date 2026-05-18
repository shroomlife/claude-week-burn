# burn-rate-gh-proxy

Stateless Cloudflare Worker that acts as a CORS reverse-proxy for GitHub's OAuth Device Flow endpoints.

## Why this exists

GitHub's OAuth endpoints under `github.com/login/*` do not set CORS headers, so a browser SPA cannot call `POST /login/device/code` or `POST /login/oauth/access_token` directly — both fail at the preflight. This worker re-issues those two requests from the edge and returns them with proper CORS, so the SPA can complete a Device Flow with no backend of its own.

It does NOT touch anything else. No state, no DB, no secrets. It only forwards the request body and reflects the response.

## Endpoints

| Method | Path | Behavior |
|--------|-------|----------|
| `POST` | `/login/device/code` | Proxied to `github.com/login/device/code` |
| `POST` | `/login/oauth/access_token` | Proxied to `github.com/login/oauth/access_token` |
| `OPTIONS` | * | CORS preflight |
| anything else | * | `404 not_found` |

## Allowed origins

Hard-coded allowlist:
- `https://shroomlife.github.io` (production)
- `http://localhost:5173` (Vite dev)
- `http://localhost:4173` (Vite preview)

If you fork this and host elsewhere, edit `ALLOWED_ORIGINS` in `src/index.ts` before deploying.

## Deploy

Either deploy via the Cloudflare API (see the project root README — this is what we did the first time), or use wrangler locally:

```bash
bun install -g wrangler
wrangler login
wrangler deploy
```

Final URL: `https://burn-rate-gh-proxy.shroomlife.workers.dev`

## Cost

Free tier covers 100,000 requests/day. One full login uses ~6 requests (1 device-code + 5 token-polls). Effective monthly cost: **0,00 €**.
