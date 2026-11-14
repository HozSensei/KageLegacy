<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusIcon from './StatusIcon.vue'

defineOptions({ name: 'PlayerStatus' })

const props = defineProps({
  player: { type: Object, required: true },
})

const { t } = useI18n()

const hpPct = computed(() => {
  const max = Math.max(1, props.player.maxHp || 1)
  return Math.max(0, Math.min(100, (100 * (props.player.hp || 0)) / max))
})

const chakraPips = computed(() => {
  const max = props.player.maxChakra ?? 3
  const cur = props.player.chakra ?? 0
  return Array.from({ length: max }, (_, i) => i < cur)
})
</script>

<template>
  <div class="player-status" data-testid="player-status">
    <div class="player-status__head">
      <h2 class="player-status__name">{{ player.name }}</h2>
      <p class="player-status__meta">
        {{ t('combat.drawPile', { n: player.drawCount ?? 0 }) }}
        ·
        {{ t('combat.discardPile', { n: player.discardCount ?? 0 }) }}
      </p>
    </div>

    <div class="player-status__bars">
      <div class="bar bar--hp">
        <div class="bar__fill" :style="{ width: `${hpPct}%` }" />
        <span class="bar__label">{{ player.hp }}/{{ player.maxHp }}</span>
      </div>
      <div v-if="player.block" class="block-chip">
        {{ t('combat.block', { n: player.block }) }}
      </div>
    </div>

    <div class="chakra" :aria-label="t('combat.chakra', { n: player.chakra, max: player.maxChakra })">
      <span
        v-for="(on, i) in chakraPips"
        :key="i"
        class="chakra__pip"
        :class="{ 'chakra__pip--on': on }"
      />
    </div>

    <div v-if="player.statuses?.length" class="player-status__statuses">
      <StatusIcon v-for="(s, idx) in player.statuses" :key="`${s.key}-${idx}`" :status="s" />
    </div>
  </div>
</template>

<style scoped>
.player-status {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.player-status__name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.1;
}

.player-status__meta {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--color-ink-muted);
}

.player-status__bars {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.bar {
  position: relative;
  flex: 1;
  height: 1.15rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-fire) 30%, transparent);
  background: color-mix(in srgb, var(--color-bg) 70%, transparent);
}

.bar__fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-fire) 70%, #5a3020),
    var(--color-fire)
  );
  transition: width 0.45s ease;
}

.bar__label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}

.block-chip {
  padding: 0.2rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--color-water) 40%, transparent);
  color: var(--color-water);
  font-size: 0.75rem;
  white-space: nowrap;
  animation: block-glow 0.5s ease;
}

.chakra {
  display: flex;
  gap: 0.35rem;
}

.chakra__pip {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
  background: transparent;
  transition: background 0.25s ease, box-shadow 0.25s ease;
}

.chakra__pip--on {
  background: radial-gradient(circle at 35% 30%, #f0d9a0, var(--color-accent));
  box-shadow: 0 0 8px color-mix(in srgb, var(--color-accent) 45%, transparent);
}

.player-status__statuses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

@keyframes block-glow {
  from {
    transform: scale(0.9);
    opacity: 0.4;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
</style>
