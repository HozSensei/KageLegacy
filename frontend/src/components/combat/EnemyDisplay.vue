<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IntentDisplay from './IntentDisplay.vue'
import StatusIcon from './StatusIcon.vue'

defineOptions({ name: 'EnemyDisplay' })

const props = defineProps({
  enemy: { type: Object, required: true },
})

const { locale, t } = useI18n()

const name = computed(() =>
  locale.value === 'en' ? props.enemy.nameEn : props.enemy.nameFr
)

const hpPct = computed(() => {
  const max = Math.max(1, props.enemy.maxHp || 1)
  return Math.max(0, Math.min(100, (100 * (props.enemy.hp || 0)) / max))
})
</script>

<template>
  <div class="enemy" data-testid="enemy-display">
    <IntentDisplay :intent="enemy.intent" />

    <div class="enemy__silhouette" aria-hidden="true">
      <div class="enemy__aura" />
      <div class="enemy__figure" />
    </div>

    <h2 class="enemy__name">{{ name }}</h2>

    <div class="enemy__bars">
      <div class="bar">
        <div class="bar__fill" :style="{ width: `${hpPct}%` }" />
        <span class="bar__label">{{ enemy.hp }}/{{ enemy.maxHp }}</span>
      </div>
      <div v-if="enemy.block" class="block-chip">
        {{ t('combat.block', { n: enemy.block }) }}
      </div>
    </div>

    <div v-if="enemy.statuses?.length" class="enemy__statuses">
      <StatusIcon v-for="(s, idx) in enemy.statuses" :key="`${s.key}-${idx}`" :status="s" />
    </div>
  </div>
</template>

<style scoped>
.enemy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.enemy__silhouette {
  position: relative;
  width: 7.5rem;
  height: 7.5rem;
  margin-top: 0.25rem;
}

.enemy__aura {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-fire) 28%, transparent),
    transparent 70%
  );
  animation: aura-breathe 3s ease-in-out infinite;
}

.enemy__figure {
  position: absolute;
  inset: 18% 28% 12%;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-ink-muted) 55%, transparent),
    color-mix(in srgb, var(--color-bg-card) 90%, #1a1210)
  );
  clip-path: polygon(50% 0%, 85% 28%, 78% 100%, 22% 100%, 15% 28%);
  border: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
}

.enemy__name {
  font-family: var(--font-display);
  font-size: 1.6rem;
  line-height: 1.1;
}

.enemy__bars {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: min(18rem, 100%);
}

.bar {
  position: relative;
  flex: 1;
  height: 1.15rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-fire) 35%, transparent);
  background: color-mix(in srgb, var(--color-bg) 70%, transparent);
}

.bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #6b2e22, var(--color-fire));
  transition: width 0.45s ease;
}

.bar__label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 600;
}

.block-chip {
  padding: 0.2rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--color-water) 40%, transparent);
  color: var(--color-water);
  font-size: 0.75rem;
}

.enemy__statuses {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
}

@keyframes aura-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}
</style>
