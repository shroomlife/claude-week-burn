# Claude Burn Rate

> Live weekly pace tracker für deine Claude Quota — installierbar als PWA, mit lokaler Persistenz, daily snapshots und einem Pace-Bar, der auf einen Blick zeigt, ob du vorne oder hinten liegst.

**Live:** https://shroomlife.github.io/claude-week-burn/

Eine kleine Vue 3 PWA, die den rolling 7-Tage-Verbrauch deiner Claude-Quota visualisiert. Du gibst dein Reset-Datum + deinen aktuellen Usage-Stand in Prozent ein — die App berechnet daraus:

- **Headroom-Delta** — wie weit du vor (oder hinter) deinem fairen Pace liegst
- **Pace-Bar** mit Target-Tick — die einzige Visualisierung, die "ahead/behind" in <1 Sekunde beantwortet
- **Tomorrow-Robin Forecast** — eine ehrliche Prognose, wann (oder ob) du das Limit erreichst
- **Ghost-Forecast-Ring** — projiziert deinen End-of-Week-Stand bei aktuellem Tempo
- **Auto-Rollover** am Wochenende, Daily Budget, Quota übrig, Countdown

State lebt komplett im `localStorage` (versioniertes Schema, debounced writes, daily snapshot history). Keine Server. Keine Tracker. Keine Accounts.

---

## Features

| | |
|---|---|
| ⚡ | **Vue 3 + Vite + TypeScript** strict mode |
| 📱 | **PWA** — installierbar, offline-fähig, eigenes Manifest, Service Worker via Workbox |
| 💾 | **localStorage** mit Schema-Versionierung + Migration-Hook + debounced writes |
| 📅 | **Auto-Rollover** — überspringt automatisch verstrichene Wochen, setzt Usage auf 0% |
| 🎯 | **Whole-Number-Prozente** überall — keine Nachkommastellen, durchgehend Math.round() |
| 🌗 | **Light Mode** — bewusst kein Dark Mode, weniger UI-Lärm |
| 🚀 | **Confetti + Haptic** bei Mode-Wechsel in Burn (einmalig, reduced-motion-safe) |
| ⌨️ | **Command Palette** (⌘K / Ctrl+K) mit 4 Quick-Actions |
| 🏷 | **`navigator.setAppBadge`** — Homescreen-Icon zeigt aktuelle Usage-% |
| 🔗 | **Web Share API** — teile deinen Stand als Text-Card |
| ♿ | **`prefers-reduced-motion`** — alle Motion-Effekte haben Substitute, nichts wird silent gedroppt |
| 📊 | **Daily History** — 8-Tage-Rolling-Window, Basis für Trajectory-Features (V2.1) |

---

## Stack

- **Vue 3.5** (Composition API, `<script setup>`)
- **Vite 6** + **vite-plugin-pwa** (Workbox autoUpdate)
- **TypeScript** strict + `noUncheckedIndexedAccess`
- **@vueuse/core** für `useTransition`, `useDebounceFn`, `useMediaQuery`, `useEventListener`
- **lucide-vue-next** Icons (Status-Emoji bleibt Emoji, Chrome ist Icon)
- **canvas-confetti** via lazy dynamic-import
- **@fontsource-variable/outfit**, **@fontsource-variable/jetbrains-mono**, **@fontsource/instrument-serif** — self-hosted, kein Google-CDN-RTT
- **bun** als Package-Manager + Runner

---

## Setup

```bash
bun install
bun run dev          # → http://localhost:5173
```

Produktion lokal testen:

```bash
bun run build
bun run preview      # → http://localhost:4173
```

PWA-Icons aus `public/favicon.svg` neu generieren:

```bash
bun run generate-pwa-assets
```

Typecheck:

```bash
bun run typecheck
```

---

## Architektur

```
src/
├── App.vue                     # Orchestrator: clock, rollover, badge, share, palette, toasts
├── main.ts                     # createApp + Schriftarten + Styles
├── components/
│   ├── BurnHeader.vue          # Logo + ⌘K-Hint + kompakter Countdown
│   ├── PreWeekBanner.vue       # nur wenn Reset > 7 Tage entfernt
│   ├── PaceBar.vue             # primary glance — Usage-Fill + Time-Tick + Delta-Verdict
│   ├── ForecastCard.vue        # Tomorrow-Robin Narrative (Instrument Serif italic)
│   ├── GaugeHero.vue           # SVG dual ring + ghost forecast ring + center delta
│   ├── MetricsRow.vue          # Countdown + Daily Budget + Remaining
│   ├── BurnControls.vue        # Date + Slider + Chips (optimized input pipeline)
│   ├── CommandPalette.vue      # ⌘K Quick-Actions
│   └── UpdateToast.vue         # Service-Worker needRefresh / offlineReady
├── composables/
│   ├── usePersistedState.ts    # versioned localStorage primitive
│   ├── useBurnState.ts         # resetDate, usagePercent, history singleton
│   ├── useBurnComputeds.ts     # delta, status, countdown, forecast, ghostUsage, tomorrowSentence
│   ├── useClock.ts             # visibility-aware adaptive tick (1s in last hour, 60s otherwise)
│   ├── useAutoRollover.ts      # watches now > resetTs, shifts +7d, zeros usage
│   └── useReducedMotion.ts     # prefers-reduced-motion matchMedia
├── types/burn.ts               # Mode, Status, Countdown, Forecast, HistoryEntry, PersistedDataV1
└── styles/
    ├── reset.css               # box-sizing, margin reset
    ├── tokens.css              # CSS Custom Properties (Farben, Easings, Schatten, Radien)
    └── base.css                # body + mesh gradient + grain + glass primitives
```

### Performance-Disziplin

- **Backdrop-filter only on `.glass-hero`** — andere Karten sind flat `rgba(255,255,255,0.78)`. Verhindert 8-stack blur-thrash auf Mid-Range Android.
- **`contain: paint`** auf jeder Glas-Card — isoliert blur-cost vom 1Hz Countdown-Tick.
- **`transition: none`** auf Usage-Ring während Slider-Drag (`body.is-dragging`-Class) — 1:1 direkte Manipulation.
- **`useClock`** ist visibility-aware + adaptiv: 60s-Tick außerhalb der letzten Stunde, 1s erst wenn `days===0 && hours===0`.
- **Confetti** ist lazy-import — kommt erst bei Mode→burn-Transition aus dem Netz.

### Motion-Prinzip

> **Mode-Wechsel sind Events, nicht Statuses.** Loud entrance, quiet steady-state.

Jeder Mode-Wechsel triggert eine 500–620ms choreografierte Animation, dann ist die UI ruhig. Keine infinite Loops auf persistenten Elementen (kein `warn-pulse`-Wallpaper). Sparkles im Burn-Mode fade-out nach 6s.

---

## Deployment

Automatisch via GitHub Actions auf jeden Push auf `main` → GitHub Pages.

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Setzt `VITE_BASE=/claude-week-burn/` für korrekte Asset-URLs.

---

## Optional: GitHub Login + Gist Sync

Cross-Device-Sync via privatem Gist. Kein DB, kein Backend-State — nur ein winziger Cloudflare Worker, der den OAuth-Code-Exchange macht (weil GitHub `client_secret` weiterhin verlangt, auch mit PKCE).

**Architektur:**
- **Cloudflare Worker** `burn-rate-gh-proxy.shroomlife.workers.dev` (~80 Zeilen, stateless). Hält `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` als encrypted Worker Secrets, exchanged Code-for-Token gegen GitHub, returned Token an SPA. Free tier (100k req/Tag).
- **Authorization Code Flow + PKCE**: SPA generiert `code_verifier` + `code_challenge`, redirected zu `github.com/login/oauth/authorize`, GitHub redirected zurück mit `?code=`, SPA POSTet `{code, code_verifier}` an Worker `/token`, kriegt Token. Defense-in-depth selbst wenn Code in Logs leakt.
- **Token** in `localStorage` (Key `burnRate:gh:token`). Scope `gist` only — kein Repo-Access.
- **Login = remote überschreibt local**: beim ersten erfolgreichen Login wird die lokale Quota durch den Gist-Stand ersetzt. Danach normale Last-Write-Wins-Sync.
- **Gist** `claude-burn-rate-state.json` (privat) wird beim ersten Login angelegt. Push debounced 3s, Pull on init + visibilitychange.

### Setup

1. **OAuth App registrieren** auf https://github.com/settings/developers:
   - Application name: `Claude Burn Rate`
   - Homepage URL: `https://shroomlife.github.io/claude-week-burn/`
   - Authorization callback URL: `https://shroomlife.github.io/claude-week-burn/`
   - Auf "Register application" klicken
   - Auf der App-Seite: **"Generate a new client secret"** → String **sofort kopieren** (zeigt er nur einmal)

2. **Client ID** und **Client Secret** kopieren.

3. **VITE_GITHUB_CLIENT_ID als GH-Actions-Secret hinterlegen** (öffentlich, kann im Bundle erscheinen):
   ```bash
   gh secret set VITE_GITHUB_CLIENT_ID --body "Ov23liXXXXXXXXXXXXXX"
   ```

4. **Worker-Secrets setzen** (encrypted at rest, niemals im Bundle):
   ```bash
   cd worker
   wrangler secret put GITHUB_CLIENT_ID    # selber String wie oben
   wrangler secret put GITHUB_CLIENT_SECRET # NIE in Git!
   ```
   Oder via CF Dashboard → Workers → burn-rate-gh-proxy → Settings → Variables.

5. **Re-Deploy** triggern:
   ```bash
   gh workflow run "Deploy to GitHub Pages" --repo shroomlife/claude-week-burn
   ```

Nach dem Deploy: Header → "Sign in" → 1 Click → Redirect zu GitHub → Authorize → Redirect zurück → fertig. Kein Code-Paste, kein Modal.

### Worker-Fork

Eigene Instanz auf eigenem CF-Account:

```bash
cd worker
bun install -g wrangler
wrangler login
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler deploy
```

Im `worker/src/index.ts` musst du den `ALLOWED_ORIGINS` + `ALLOWED_REDIRECT_URIS`-Allowlist auf deine Domain anpassen. Dann `VITE_GH_PROXY_URL` auf deine Worker-URL setzen.

---

## License

MIT — bau dir deine eigene Burn-Rate-App damit. ✨

build by you · for you · **shroomlife flavor**
