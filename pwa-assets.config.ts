import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Override the minimal2023 preset's maskable config. Default is
// `{ padding: 0.3, resizeOptions: { fit: 'contain', background: 'white' } }`
// — that adds a 30% white border around the resized source, which is wrong
// for a source SVG that's already full-bleed with the content centered in
// the inner safe zone. We want maskable variants to be edge-to-edge with
// the same gradient, so Android's adaptive icon mask can crop to any shape
// (circle, squircle, square) without seeing white.
// The three preset variants each have their own padding default that
// fights a full-bleed source:
//   - transparent: padding 0.05 → 5% inset, visible as slightly rounded
//     corners on the regular pwa-{64,192,512} PNGs
//   - maskable:    padding 0.3  + white background
//   - apple:       its own padding + white background
// Override all three to padding 0 + transparent background so the source
// SVG renders edge-to-edge with no white framing anywhere.
const preset = {
  ...minimal2023Preset,
  transparent: {
    ...minimal2023Preset.transparent,
    padding: 0,
    resizeOptions: {
      ...minimal2023Preset.transparent.resizeOptions,
      background: 'transparent',
    },
  },
  maskable: {
    ...minimal2023Preset.maskable,
    padding: 0,
    resizeOptions: {
      ...minimal2023Preset.maskable.resizeOptions,
      background: 'transparent',
    },
  },
  apple: {
    ...minimal2023Preset.apple,
    padding: 0,
    resizeOptions: {
      ...minimal2023Preset.apple.resizeOptions,
      background: 'transparent',
    },
  },
}

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset,
  images: ['public/logo.svg'],
})
