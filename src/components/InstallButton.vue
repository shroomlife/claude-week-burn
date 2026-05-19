<script setup lang="ts">
import { computed } from 'vue'
import IconDownload from '~icons/ph/download-simple-bold'
import { useInstallPrompt } from '../composables/useInstallPrompt'

const emit = defineEmits<{ (e: 'show-ios'): void }>()
const installer = useInstallPrompt()

async function onClick(): Promise<void> {
  if (installer.canInstall.value) {
    await installer.install()
    return
  }
  if (installer.needsIosInstructions.value) {
    emit('show-ios')
  }
}

const visible = computed(() => {
  if (installer.isStandalone.value) return false
  return installer.canInstall.value || installer.needsIosInstructions.value
})
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="install-pill"
    :title="installer.canInstall.value ? $t('install.ctaApp') : $t('install.ctaIos')"
    :aria-label="$t('install.ariaApp')"
    @click="onClick"
  >
    <IconDownload />
    <span class="lbl">Install</span>
  </button>
</template>

<style scoped>
.install-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  background: var(--c-surface);
  border: 1px solid var(--c-hair);
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 500;
  color: var(--c-ink);
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
}
.install-pill:hover {
  background: rgba(15, 23, 42, 0.03);
  transform: translateY(-1px);
  border-color: rgba(234, 88, 12, 0.4);
  color: var(--c-flame-2);
}
.install-pill :deep(svg) { width: 13px; height: 13px; }

@media (max-width: 480px) {
  .install-pill .lbl { display: none; }
  .install-pill { padding: 6px 8px; }
}
</style>
