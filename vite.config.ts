import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import Icons from 'unplugin-icons/vite'

// For GitHub Pages: served under /<repo>/. Override with VITE_BASE if you fork to a different repo name.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/claude-week-burn/' : '/')

export default defineConfig({
  base,
  plugins: [
    vue(),
    Icons({ compiler: 'vue3', defaultStyle: 'display: inline-block; vertical-align: middle;' }),
    VitePWA({
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
        icons: [
          { src: `${base}pwa-64x64.png`, sizes: '64x64', type: 'image/png' },
          { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}maskable-icon-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the small, must-have shell — JS, CSS, HTML, icons,
        // manifest. Fonts (woff2, ~250KB across weights/subsets) are skipped
        // so the SW install is lean; the browser's HTTP cache covers them
        // after first load.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,ico}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
