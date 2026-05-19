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

createApp(App).use(i18n).mount('#app')
