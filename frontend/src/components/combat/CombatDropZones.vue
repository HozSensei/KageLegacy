<script setup>
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'CombatDropZones' });

const props = defineProps({
  actions: { type: Array, default: () => ['play', 'discard', 'reserve'] },
  disabledActions: { type: Array, default: () => [] },
  hoveredZone: { type: String, default: null },
});

const { t } = useI18n();

const zones = {
  play: { icon: 'attack', label: 'combat.playCard', tone: 'vermilion' },
  'play-ally': { icon: 'profile', label: 'coop.playOnAlly', tone: 'leaf' },
  discard: { icon: 'essence', label: 'combat.discardForChakra', tone: 'gold' },
  'discard-for-draw': {
    icon: 'decks',
    label: 'combat.discardForDraw',
    tone: 'indigo',
  },
  reserve: { icon: 'decks', label: 'combat.reserveCard', tone: 'indigo' },
};

function zoneLabel(action) {
  return action === 'play' && props.actions.includes('play-ally')
    ? 'coop.playOnEnemy'
    : zones[action].label;
}
</script>

<template>
  <div class="arena-drop-board">
    <div
      class="arena-drop-board__cards"
      :class="{ 'arena-drop-board__cards--coop': actions.includes('play-ally') }"
    >
      <div
        v-for="(action, index) in actions"
        :key="action"
        class="arena-drop-zone"
        :class="{
          'arena-drop-zone--disabled': disabledActions.includes(action),
          'arena-drop-zone--active': hoveredZone === action && !disabledActions.includes(action),
        }"
        :data-tone="zones[action].tone"
        :data-combat-drop-zone="action"
        :data-combat-drop-disabled="disabledActions.includes(action) ? 'true' : 'false'"
        :data-testid="`drop-zone-${action}`"
      >
        <span class="arena-drop-zone__number" aria-hidden="true">0{{ index + 1 }}</span>
        <AppIcon
          class="arena-drop-zone__icon"
          :name="zones[action].icon"
          size="2.5rem"
          :stroke-width="1.5"
        />
        <span class="arena-drop-zone__label">{{ t(zoneLabel(action)) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.arena-drop-board {
  position: absolute;
  z-index: 8;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 0.75rem;
  overflow: hidden;
  background: var(--color-bg);
}

.arena-drop-board__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(0.4rem, 1.2vw, 1rem);
  width: min(39rem, 100%);
}

.arena-drop-board__cards--coop {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  width: min(48rem, 100%);
}

.arena-drop-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  aspect-ratio: 296 / 444;
  min-width: 0;
  padding: 1rem 0.65rem;
  overflow: hidden;
  border: 2px dashed var(--tone);
  border-radius: 0.55rem;
  background: var(--tone-tint);
  color: var(--color-ink);
  text-align: center;
  transition:
    border-color var(--dur-fast) ease,
    box-shadow var(--dur-fast) ease,
    transform var(--dur-fast) var(--ease-out-quint);
}

.arena-drop-zone::after {
  position: absolute;
  inset: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--tone) 28%, transparent);
  border-radius: 0.3rem;
  content: '';
  pointer-events: none;
}

.arena-drop-zone__number {
  position: absolute;
  top: 0.65rem;
  left: 0.75rem;
  font-family: var(--font-display);
  font-size: clamp(0.9rem, 2vw, 1.25rem);
  font-weight: 800;
  color: var(--tone);
}

.arena-drop-zone__icon {
  color: var(--tone);
}

.arena-drop-zone__label {
  max-width: 11rem;
  font-family: var(--font-display);
  font-size: clamp(0.72rem, 1.6vw, 1rem);
  font-weight: 800;
  line-height: 1.15;
  overflow-wrap: anywhere;
  text-transform: uppercase;
}

.arena-drop-zone--active {
  z-index: 1;
  border-style: solid;
  box-shadow:
    0 0 0 0.2rem var(--tone),
    0 0.75rem 1.75rem color-mix(in srgb, var(--tone) 30%, transparent);
  transform: translateY(-0.35rem);
}

@media (max-width: 560px) {
  .arena-drop-board__cards--coop {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .arena-drop-board__cards--coop .arena-drop-zone {
    aspect-ratio: auto;
    min-height: 6rem;
  }
}

.arena-drop-zone--disabled {
  opacity: 0.42;
  filter: grayscale(0.6);
}
</style>
