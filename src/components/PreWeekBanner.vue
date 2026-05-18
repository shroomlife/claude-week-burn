<script setup lang="ts">
defineProps<{
  days: number
  weekStartLabel: string
}>()
defineEmits<{ (e: 'snap'): void }>()
</script>

<template>
  <section class="hint" role="status">
    <span class="hint-emoji" aria-hidden="true">🤔</span>
    <div>
      <strong>Dein Reset ist {{ Math.ceil(days) }} Tage entfernt — passt das?</strong>
      <p>
        Claude nutzt ein rolling 7-Tage-Fenster. Mit deinem Datum würde die Woche erst am
        <strong>{{ weekStartLabel }}</strong> starten — bis dahin bleibt „Zeit verstrichen" bei 0% und der Vergleich kippt unrealistisch ins Rot.
      </p>
      <button class="cta" type="button" @click="$emit('snap')">📅 Reset auf 7 Tage ab jetzt setzen</button>
    </div>
  </section>
</template>

<style scoped>
.hint {
  padding: 16px 22px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  font-size: 14px;
  color: #92400e;
  background: linear-gradient(135deg, rgba(254, 240, 199, 0.92) 0%, rgba(254, 215, 170, 0.78) 100%);
  border: 1px solid rgba(234, 88, 12, 0.25);
  border-radius: var(--r-card-sm);
  box-shadow: 0 14px 36px -16px rgba(234, 88, 12, 0.3);
  contain: paint;
}
.hint-emoji { font-size: 24px; line-height: 1; }
.hint strong { color: #9a3412; font-weight: 700; }
.hint p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #78350f;
  line-height: 1.5;
}
.cta {
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  font-weight: 700;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(234, 88, 12, 0.35);
  border-radius: var(--r-pill);
  color: #9a3412;
  transition: transform 0.15s var(--ease-spring), background 0.2s ease;
}
.cta:hover { transform: translateY(-1px); background: white; }
</style>
