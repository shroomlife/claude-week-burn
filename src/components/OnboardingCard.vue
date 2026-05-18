<script setup lang="ts">
import { computed } from 'vue'
import IconLightning from '~icons/ph/lightning-fill'
import IconArrow from '~icons/ph/arrow-right-bold'
import DatePicker from './DatePicker.vue'
import UsageStepper from './UsageStepper.vue'

const props = defineProps<{
  resetDate: string
  usagePercent: number
}>()

const emit = defineEmits<{
  (e: 'update:resetDate', v: string): void
  (e: 'update:usagePercent', v: number): void
  (e: 'complete'): void
}>()

// Always enabled — both fields have valid defaults; user just confirms.
const canStart = computed(() => Boolean(props.resetDate))

function onConfirm(): void {
  if (canStart.value) emit('complete')
}
</script>

<template>
  <section class="onboarding card">
    <div class="hero">
      <div class="logo" aria-hidden="true"><IconLightning /></div>
      <div class="text">
        <h1>Willkommen bei Claude Burn Rate</h1>
        <p>
          Zwei kurze Sachen brauchst du noch, dann läuft alles —
          ohne Account, alles bleibt lokal. Wenn du auf einem anderen Gerät
          schon eingeloggt warst, kannst du oben rechts auch direkt mit GitHub
          anmelden — dann ziehen wir deinen Stand rüber.
        </p>
      </div>
    </div>

    <ol class="steps">
      <li class="step">
        <div class="step-head">
          <span class="num">1</span>
          <div>
            <h2>Wann ist dein Weekly Reset?</h2>
            <p>Das Datum, an dem deine wöchentliche Quota wieder bei 0% startet.</p>
          </div>
        </div>
        <div class="step-body">
          <DatePicker
            :model-value="resetDate"
            @update:model-value="emit('update:resetDate', $event)"
          />
        </div>
      </li>

      <li class="step">
        <div class="step-head">
          <span class="num">2</span>
          <div>
            <h2>Wie viel hast du diese Woche schon verbraucht?</h2>
            <p>In Prozent. Auf den meisten Plänen siehst du das im Claude Code Status.</p>
          </div>
        </div>
        <div class="step-body">
          <UsageStepper
            :value="usagePercent"
            :min="0"
            :max="100"
            @change="emit('update:usagePercent', $event)"
          />
        </div>
      </li>
    </ol>

    <button class="cta" type="button" :disabled="!canStart" @click="onConfirm">
      Los geht's <IconArrow />
    </button>
  </section>
</template>

<style scoped>
.onboarding {
  padding: 28px 32px 26px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.hero {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--c-hair);
}
.logo {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fb923c 0%, #f43f5e 65%, #d946ef 100%);
  color: white;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.logo :deep(svg) { width: 28px; height: 28px; }

.hero .text { min-width: 0; }
.hero h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.022em;
  color: var(--c-ink);
  line-height: 1.15;
  text-wrap: balance;
}
.hero p {
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--c-mute);
  letter-spacing: -0.005em;
  text-wrap: pretty;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.step {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step-head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: flex-start;
}
.num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--c-ink);
  color: white;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}
.step-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.012em;
  color: var(--c-ink);
  line-height: 1.3;
}
.step-head p {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--c-mute-soft);
  line-height: 1.5;
  letter-spacing: -0.005em;
}
.step-body {
  padding-left: 38px;
}

.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 18px;
  margin-top: 6px;
  background: var(--c-ink);
  color: white;
  border: 0;
  border-radius: var(--r-input);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: -0.005em;
  transition: transform 0.15s var(--ease-spring), background 0.2s ease;
}
.cta:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #1e293b;
}
.cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cta :deep(svg) { width: 16px; height: 16px; }

@media (max-width: 640px) {
  .onboarding { padding: 22px 20px 20px; }
  .hero { grid-template-columns: 1fr; gap: 12px; }
  .hero h1 { font-size: 19px; }
  .step-body { padding-left: 0; }
}
</style>
