<script setup lang="ts">
import { computed } from 'vue'
import { MessageCircle } from 'lucide-vue-next'

const props = defineProps<{
  sentence: string
  projectedEnd: number
}>()

const projectedTone = computed(() => {
  if (props.projectedEnd > 100) return 'over'
  if (props.projectedEnd > 85) return 'tight'
  return 'safe'
})
</script>

<template>
  <section class="forecast">
    <div class="bubble" aria-hidden="true">
      <MessageCircle :size="18" :stroke-width="2" />
    </div>
    <div class="body">
      <div class="kicker">
        <span>Tomorrow Robin</span>
        <span class="proj" :class="`proj-${projectedTone}`">
          → <span class="num">{{ projectedEnd }}%</span>
        </span>
      </div>
      <p class="line">{{ sentence }}</p>
    </div>
  </section>
</template>

<style scoped>
.forecast {
  display: flex;
  gap: 14px;
  padding: 16px 20px;
  background: var(--c-glass);
  border: 1px solid var(--c-glass-border);
  border-radius: var(--r-card-sm);
  box-shadow: var(--s-card-flat);
  contain: paint;
  align-items: flex-start;
}
.bubble {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(199, 210, 254, 0.6), rgba(199, 210, 254, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.2);
  color: #4338ca;
}
.body { flex: 1; min-width: 0; }
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--c-mute);
  margin-bottom: 4px;
}
.proj {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  letter-spacing: 0.02em;
  text-transform: none;
}
.proj-safe   { background: rgba(16, 185, 129, 0.13); color: #047857; }
.proj-tight  { background: rgba(245, 158, 11, 0.16); color: #b45309; }
.proj-over   { background: rgba(239, 68, 68, 0.16); color: #b91c1c; }
.proj .num { font-family: var(--font-mono); }
.line {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 18px;
  line-height: 1.35;
  color: var(--c-ink);
  letter-spacing: -0.005em;
  text-wrap: balance;
}

@media (max-width: 560px) {
  .forecast { padding: 14px 16px; gap: 12px; }
  .line { font-size: 16.5px; }
}
</style>
