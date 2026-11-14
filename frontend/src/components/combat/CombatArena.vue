<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EnemyDisplay from './EnemyDisplay.vue'
import PlayerStatus from './PlayerStatus.vue'
import Hand from './Hand.vue'
import CombatLog from './CombatLog.vue'

defineOptions({ name: 'CombatArena' })

const props = defineProps({
  combat: { type: Object, required: true },
  logs: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits([
  'select-card',
  'play-card',
  'end-turn',
  'discard-chakra',
  'forfeit',
])

const { t } = useI18n()

const outcomeKey = computed(() => {
  if (props.combat.state === 'victory') return 'combat.victory'
  if (props.combat.state === 'defeat') return 'combat.defeat'
  if (props.combat.state === 'forfeited') return 'combat.forfeited'
  return null
})

const canAct = computed(
  () => props.combat.currentPhase === 'player_turn' && props.combat.state === 'in_progress'
)
</script>

<template>
  <div class="arena" data-testid="combat-arena">
    <div class="arena__bg" aria-hidden="true" />

    <header class="arena__top">
      <p class="arena__turn">
        {{ t('combat.turn', { n: combat.currentTurn }) }}
        <span class="arena__phase">· {{ t(`combat.phases.${combat.currentPhase}`) }}</span>
      </p>
      <button
        type="button"
        class="btn-ghost text-xs"
        :disabled="busy || combat.state !== 'in_progress'"
        @click="emit('forfeit')"
      >
        {{ t('combat.forfeit') }}
      </button>
    </header>

    <div v-if="outcomeKey" class="arena__banner" :class="`arena__banner--${combat.state}`">
      {{ t(outcomeKey) }}
    </div>

    <section class="arena__enemy">
      <EnemyDisplay :enemy="combat.enemy" />
    </section>

    <div class="arena__divider" aria-hidden="true" />

    <section class="arena__player">
      <PlayerStatus :player="combat.player" />
      <CombatLog class="arena__log" :logs="logs" />
    </section>

    <section class="arena__hand-wrap">
      <Hand
        :cards="combat.player.hand || []"
        :selected-id="selectedId"
        :disabled="busy || !canAct"
        :chakra="combat.player.chakra"
        @select="emit('select-card', $event)"
        @play="emit('play-card', $event)"
      />

      <div class="arena__actions">
        <button
          type="button"
          class="btn-secondary text-xs"
          :disabled="busy || !canAct || !selectedId || combat.player.discardedForChakra"
          @click="emit('discard-chakra')"
        >
          {{ t('combat.discardForChakra') }}
        </button>
        <button
          type="button"
          class="btn-primary text-xs"
          :disabled="busy || !canAct || !selectedId"
          data-testid="play-card-btn"
          @click="emit('play-card')"
        >
          {{ t('combat.playCard') }}
        </button>
        <button
          type="button"
          class="btn-primary text-xs"
          :disabled="busy || !canAct"
          data-testid="end-turn-btn"
          @click="emit('end-turn')"
        >
          {{ t('combat.endTurn') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.arena {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 70vh;
  padding: 1rem 0 1.5rem;
}

.arena__bg {
  pointer-events: none;
  position: absolute;
  inset: -1rem -1.5rem;
  z-index: -1;
  background:
    radial-gradient(ellipse 80% 50% at 50% 18%, color-mix(in srgb, var(--color-fire) 14%, transparent), transparent 60%),
    radial-gradient(ellipse 70% 45% at 50% 88%, color-mix(in srgb, var(--color-accent-soft) 12%, transparent), transparent 55%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-bg-soft) 80%, transparent), var(--color-bg));
  opacity: 0.95;
}

.arena__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.arena__turn {
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.arena__phase {
  color: var(--color-ink-muted);
  font-family: var(--font-sans);
  font-size: 0.8rem;
}

.arena__banner {
  text-align: center;
  padding: 0.85rem 1rem;
  font-family: var(--font-display);
  font-size: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
  animation: banner-in 0.45s ease;
}

.arena__banner--victory {
  color: var(--color-win);
  border-color: color-mix(in srgb, var(--color-win) 40%, transparent);
}

.arena__banner--defeat,
.arena__banner--forfeited {
  color: var(--color-fire);
  border-color: color-mix(in srgb, var(--color-fire) 40%, transparent);
}

.arena__enemy {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0 0.25rem;
}

.arena__divider {
  height: 1px;
  margin: 0.25rem 0;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-line-mix, var(--color-accent-soft)) 35%, transparent),
    transparent
  );
}

.arena__player {
  display: grid;
  gap: 1rem;
}

@media (min-width: 900px) {
  .arena__player {
    grid-template-columns: 1.4fr 1fr;
    align-items: start;
  }
}

.arena__hand-wrap {
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--color-line) 70%, transparent);
}

.arena__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

@keyframes banner-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
