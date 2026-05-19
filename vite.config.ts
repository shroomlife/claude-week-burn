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
      // 'prompt' (not autoUpdate) so the new SW stays in 'waiting' until the
      // user clicks Reload in UpdateToast. Combined with skipWaiting=false /
      // clientsClaim=false this avoids the foot-gun where a half-loaded tab
      // mixes old JS with a freshly-activated SW serving new assets.
      registerType: 'prompt',
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
        icons: [
          { src: `${base}pwa-64x64.png`, sizes: '64x64', type: 'image/png' },
          { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}maskable-icon-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Lean shell precache — JS/CSS/HTML/icons/manifest. Fonts (woff2)
        // stay on the HTTP cache after first load to keep SW install small.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,ico}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Keep false: the SW waits in 'installed' until UpdateToast calls
        // updateSW(true), then reloads. Prevents old-tab/new-SW asset mismatch.
        clientsClaim: false,
        skipWaiting: false,
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
