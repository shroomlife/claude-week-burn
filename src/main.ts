import { createApp } from 'vue'

import '@fontsource-variable/outfit/index.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'

import './styles/reset.css'
import './styles/tokens.css'
import './styles/base.css'

import App from './App.vue'
import { i18n } from './i18n'

const app = createApp(App).use(i18n)
app.mount('#app')

// Fade out the boot splash (declared inline in index.html) on the next
// animation frame after Vue has mounted + the first paint settled. The
// CSS in index.html handles the opacity transition + pointer-events
// gate; once it finishes we drop the element from the DOM entirely so
// it can't intercept anything.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.add('boot-ready')
    window.setTimeout(() => {
      const splash = document.getElementById('boot-splash')
      splash?.remove()
    }, 600)
  })
})
