# X / Cross-Platform Launch Plan — Claude Burn Rate

Last updated: 2026-05-19 · for `shroomlife.github.io/claude-week-burn`

## TL;DR

**Pick one Tuesday or Wednesday morning between 09:30–10:30 CET.** Post a single banger to X (pain-first hook, screen-cap GIF, link in reply 1). Same hour: drop Show HN, r/ClaudeAI, Bluesky. Next morning: rewritten LinkedIn post. Total active time on launch day: ~90 min of replying + monitoring.

Realistic outcome ranges:
- **Floor (silence):** 20-50 GH stars, 100-300 sessions in week 1.
- **Median (one good newsletter pickup):** 200-800 stars, 2-5k sessions.
- **Tail (lands a thread quote-RT from a 50k+ Claude-niche account):** 1-5k stars, 10-50k sessions.

The Clawdmeter precedent (May 10-14, 2026) showed this nichenkomplex is hot right now. Don't over-engineer the post — the product itself does most of the work.

---

## Pre-launch checklist

Run through this the day before posting. Each item is a launch-day disqualifier if missing.

- [ ] **Live URL responds 200 + correct meta:** `curl -sI https://shroomlife.github.io/claude-week-burn/` → confirm `og:image`, `twitter:image`, `og:description` all reference the latest assets.
- [ ] **Pinned tweet on @shroomlife** updated with the project URL + one-liner.
- [ ] **X bio** mentions "Claude Burn Rate — live weekly pace tracker" with link.
- [ ] **README hero** has a high-quality screenshot or GIF inline (people who click the GitHub link bounce fast otherwise).
- [ ] **GIF asset rendered**: 4-6 seconds, 1200×630 or 1080×1080, ≤8MB, looping. Recording the burn bar filling + Tomorrow Robin forecast number ticking is the highest-converting visual. Use Playwright + ffmpeg if you don't have ScreenStudio.
- [ ] **OG card live**: visit `https://www.opengraph.xyz/?url=https://shroomlife.github.io/claude-week-burn/` to verify the rendered card preview. Should show the orange-magenta gradient + lightning bolt.
- [ ] **Mobile sanity-pass**: open the live URL on actual phone, run the onboarding once. Make sure it doesn't break.
- [ ] **One backup feature flag** ready in case launch reveals a bug — App Reset action visible in footer so any first-time user with a stuck state can self-recover.

---

## Hook variants — pick exactly one

### Variant A — Pain-first, third-person frame *(recommended, lowest flop risk)*

> Burned through my weekly Claude Code quota by Tuesday afternoon. Again.
>
> So I built a tiny live pace tracker. Browser, installable PWA, all local, free + MIT.
>
> [GIF: 4-6s loop of the burn bar filling + Tomorrow Robin forecast ticking]
>
> *(Link in reply 1.)*

**Why it works:** mirrors the exact Clawdmeter frame that went viral in this niche two weeks ago. Specific pain ("Tuesday"). Self-deprecating tense ("again"). Concrete features listed inline. Link withheld from OP to dodge X's link-suppression algo.

### Variant B — Numbers + receipt

> 4 days. That's how long my "weekly" Claude Code quota lasted last week.
>
> Built a PWA that shows the burn rate in real time so I stop running out by Wednesday.
>
> [Screenshot of the dashboard at ~73% usage on day 3 — picks up red Sparmodus accent]

**When to pick:** if your follower base responds better to data-driven tone than personal stories. Higher ceiling than A on engineering-heavy audiences, lower ceiling on general indie-Twitter.

### Variant C — Contrarian / negative space *(highest swing, highest flop risk)*

> Anthropic won't tell you your weekly burn rate. I will.
>
> [GIF]
>
> Free, open-source, runs in your browser. No account needed.

**Risk:** reads snarky-at-Anthropic. Could energize the "transparency" crowd OR alienate Anthropic employees who otherwise might amplify. Only pick if you actually want to swing for a quote-RT from a contrarian-leaning account.

**Final pick: A.** Use B or C only if A flops within 4 hours (≤50 likes / ≤5 RTs).

---

## Reply chain (post all within 5 min of the OP)

### Reply 1 — the link

> https://shroomlife.github.io/claude-week-burn/
>
> Local-first, optional GitHub gist sync for cross-device. Now in 10 languages (EN/DE/ES/FR/PT/JA/KO/ZH/HI/UK).

### Reply 2 — the "how it works" hook for technical replies

> Three numbers it lives off:
> — your weekly reset date
> — your current usage %
> — the system clock
>
> Everything else (daily budget, forecast, headroom, "Tomorrow Robin" projection) is derived live. No backend, no tracker, no account required.

### Reply 3 — credit / context *(only post if the thread is getting traction at the 30 min mark)*

> Inspired by @bearlyai surfacing Clawdmeter the other week — different shape (web vs hardware) but same itch. cc @AnthropicAI

**Why delay the cc:** tagging Anthropic in the OP looks like begging. Tagging in a later reply when traction is already visible reads as a heads-up between peers.

---

## Cross-post sequence (launch day)

Times are minutes after the X post lands.

| T+ | Platform | Format | What to change vs X |
|----|----------|--------|---------------------|
| 0 | X | OP + 2 replies | — |
| +10 | Show HN | "Show HN: A local pace tracker for the Claude Code weekly quota" | Drop the GIF (HN won't render it), lead with the URL, link to the GH repo |
| +15 | r/ClaudeAI | Title: same Show HN title; body: A-hook copy + screenshot | Mention "MIT / no account" early — that subreddit values both |
| +30 | Bluesky | Same A-hook, looser punctuation, mention "no algo, just a pace tracker" — Bluesky's tribe likes anti-algo framing | Keep the GIF |
| +45 | Fosstodon | Open-source angle bold: "open source · MIT · runs in your browser · no account" | More "what" less "why", post in #FOSS + #DevTools tags |
| +60 | Hacker News /newest babysitting | Reply to any first comments within 5 min | Be friendly, never defensive |
| +24h | LinkedIn | Rewrite as problem/insight: "Anthropic shipped weekly limits with no in-app pace UI. I needed one. Sharing what I built." | Drop "burned through Tuesday afternoon" — LinkedIn hates that voice |
| +48h | dev.to / Hashnode | Optional: "Building a local-first PWA in a weekend" writeup linking back | Educational, not promotional |

**Skip Product Hunt.** PH's audience is mostly product-managers and consumer-tool reviewers, not Claude power users. A flop hurts more than a no-show.

---

## Anti-patterns — never do

1. **"Excited to announce…"** → instant scroll-past. Replace with concrete pain or specific number.
2. **Link in the OP** → since March 2026, X heavily suppresses link-posts on the algorithm. Median engagement drops ~60% vs text-only OPs. Link goes in reply 1.
3. **Tagging @AnthropicAI in the OP** → reads as begging, can actively suppress reach. Tag later in a reply once organic traction is visible.
4. **3+ hashtags** → spam-filter signal on X. Max 1 (`#BuildInPublic` only if you're committed to that crowd). Honestly: skip them all.
5. **Generic audience framing** ("for developers") → too broad. "For devs who hit the Claude weekly cap by Wednesday" is what converts.
6. **Text-only post for a visual tool** → self-sabotage. The GIF is the artifact.
7. **Auto-cross-post identical copy** → algorithm-flag on multiple platforms + each crowd has a different vocabulary. Rewrite per platform.
8. **Replying defensively to critics in the first 6 hours** → the X algorithm reads heated reply threads as low-quality. Either ignore or ack-and-move-on.

---

## What the GIF should show (in 4–6 seconds)

Loop in this order, ~1 second per beat:

1. Empty onboarding form
2. Quick fill: pick reset date, slide usage to 47%
3. Click "Los geht's" — onboarding fades, main view cascades in
4. Camera pans to the PaceBar — the orange fill animates from 0 to 47%
5. Tomorrow Robin sentence types itself in: *"Bei aktuellem Tempo landest du bei 88%."*
6. Quick zoom to the countdown: "RESET IN 4d 03h 27m"
7. Loop

**Production:** Playwright can drive the recording. ffmpeg converts the MP4 to optimized GIF/WebP. Target ≤4MB so X autoplay kicks in on mobile.

```bash
# Sketch — adapt scripts/screenshots.mjs for video capture
npx playwright codegen --target=javascript --device "iPhone 13" https://shroomlife.github.io/claude-week-burn/
ffmpeg -i recording.mp4 -vf "fps=24,scale=1080:-1:flags=lanczos" -c:v libwebp -lossless 0 -q:v 70 -loop 0 hero.webp
```

---

## Day-of monitoring playbook

**First 90 min** — eyes on. Reply to every comment within 5 min. Track stars/forks via `gh repo view shroomlife/claude-week-burn --json stargazerCount` every 15 min.

**Hour 2–6** — drift mode. Check every 30 min, respond to the heaviest engagement, ignore trolls.

**Hour 6+** — only respond to substantive issues (bug reports, feature requests).

**24h retrospective notes file:** write a quick `LAUNCH-RESULT-<date>.md` with:
- Stars before / after
- Sessions (GoatCounter, Plausible, or Vercel Analytics if added)
- 5 most-liked replies
- 3 things that worked, 3 that flopped

---

## Failure-recovery mode

**If the OP gets <30 likes in the first 4 hours:**

- Don't delete-and-repost — X penalizes that pattern.
- Quote-RT the OP with a second-take hook 36-48 hours later. Different angle, different visual.
- Move energy to Show HN / Reddit / Bluesky where the original post might still pick up.
- Don't take it personally. ~80% of even good indie launches flop on the first try.

**If a bug surfaces post-launch:**

- App Reset action in the footer is your first line of self-recovery for users.
- Hot-fix → deploy → tweet "Quick patch for X, hit reload on the toast." That tweet often outperforms the launch post because it shows you give a shit.

---

## Stretch ideas (week 2+)

- A "share my burn rate" referral loop using the new ShareModal — every share is a PNG with the URL pill on it.
- A weekly newsletter post: "What I burned this week."
- Public Sankey of usage modes (cruise / careful / burn / save) — anonymized aggregate, opt-in only.
- "Burn Rate as a Service" — host a public read-only dashboard for selected high-profile Claude users (with permission).

These are post-traction ideas. Don't pre-build them.

---

## Asset register

Paths in the repo as of this writing:

| Asset | Path |
|-------|------|
| App icon (PWA) | `public/logo.svg`, `public/pwa-{64,192,512}.png`, `public/maskable-icon-512x512.png` |
| OG card | `public/og-card.png` (1536×1024) |
| Screenshot set | `screenshots/01-hero-desktop.png` → `04-mobile-main.png` |
| Locale shots | `screenshots/locales-10/*.png` |
| Mobile shots | `screenshots/mobile-check/*.png` |
| Share-card preview | `screenshots/share-card/card-de.png` |

---

## Final word

The product is in good shape. The 10-language footprint, the Local-First positioning, the optional GitHub sync, and the working share-card-as-PNG are all things that ladder into "this person actually finished it." That alone separates you from 95% of weekend projects on the launch page.

Don't optimize the post for an hour. Pick A, post Tuesday morning, walk to the kitchen, come back to reply.
