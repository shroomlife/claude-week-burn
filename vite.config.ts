import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import Icons from 'unplugin-icons/vite'

// For GitHub Pages: served under /<repo>/. Override with VITE_BASE if you fork to a different repo name.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/claude-week-burn/' : '/')

const buildSha: string = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()

const buildTime: string = new Date().toISOString()

export default defineConfig({
  base,
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
  plugins: [
    vue(),
    Icons({ compiler: 'vue3', defaultStyle: 'display: inline-block; vertical-align: middle;' }),
    VitePWA({
      // Auto-update + NetworkFirst runtime caching: the SW always tries the
      // network first and only falls back to cache when offline. New deploys
      // land on the next reload without any "Neue Version" prompt-and-reload
      // dance. skipWaiting + clientsClaim ensure the new SW takes over the
      // tab as soon as the user navigates, with no stale-asset mixing
      // because NetworkFirst pulls fresh anyway.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Claude Burn Rate',
        short_name: 'Burn Rate',
        description: 'Live weekly pace tracker — shroomlife flavor',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fbfbfd',
        theme_color: '#ea580c',
        // Every pwa-{N}.png is full-bleed gradient with the bolt centered
        // inside the 80% safe zone, so each one qualifies as both 'any'
        // (regular use) AND 'maskable' (adaptive icon). Declaring 'any
        // maskable' tells Android to use it as a maskable icon EVEN for
        // plain home-screen shortcuts — Chrome was otherwise wrapping the
        // 'any'-purpose PNG in a white launcher tile, giving a visible
        // border around the gradient on the home screen.
        icons: [
          { src: `${base}pwa-64x64.png`, sizes: '64x64', type: 'image/png', purpose: 'any maskable' },
          { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: `${base}maskable-icon-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Minimal precache — icons + manifest only. index.html is deliberately
        // EXCLUDED: precaching it causes Workbox to register an implicit
        // cache-first NavigationRoute (via createHandlerBoundToURL +
        // directoryIndex normalization) that runs BEFORE the explicit
        // NetworkFirst route below — silently shadowing it. The result was
        // every navigation served from precache, and after a deploy the
        // cached HTML still referenced the previous build's JS hash, which
        // GitHub Pages no longer hosted → 404 on the bundle → white screen
        // that survived F5 because each F5 hit the same precache. With
        // navigations on a real NetworkFirst path the HTML and the JS hashes
        // it references stay in sync; offline-after-first-visit still works
        // via the 'pages' runtime cache. The recovery.js script in <head> is
        // the belt+suspenders for any future cache pathology that gets past
        // this. (See commit history of vite.config.ts + public/recovery.js.)
        globPatterns: ['**/*.{svg,ico,webmanifest}'],
        // EXPLICIT empty string — vite-plugin-pwa silently defaults this to
        // 'index.html' (see node_modules/vite-plugin-pwa/dist/index.js:791),
        // and Object.assign only overwrites keys we set. The Workbox sw
        // template generates the NavigationRoute under `if (navigateFallback)`,
        // so an empty string falsy-skips the auto-injection AND keeps
        // index.html out of the precache (also gated on the same value).
        // This is the actual fix for the recurring white-screen on F5.
        navigateFallback: '',
        cleanupOutdatedCaches: true,
        // Auto-takeover: new SW activates + claims the page right away.
        // Safe with NetworkFirst because the new SW won't be serving
        // mismatched stale chunks — it'll just fetch the fresh ones.
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Page navigations: always try the network first (3s timeout),
            // fall back to cached HTML when offline.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // JS + CSS + workers: network-first too. Assets are content-
            // hashed by Vite so a cached old file under the same URL is
            // never a problem; this just keeps the SW from serving the
            // previous build's JS over a fresh-looking shell.
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'worker',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Images + fonts: stale-while-revalidate. They rarely change
            // and the SWR strategy keeps loads instant while the SW
            // quietly re-fetches in the background.
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'media',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          confetti: ['canvas-confetti'],
        },
      },
    },
  },
})
