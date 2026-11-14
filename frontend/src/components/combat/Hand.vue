<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'Hand' })

const props = defineProps({
  cards: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  chakra: { type: Number, default: 0 },
})

const emit = defineEmits(['select', 'play'])

const { locale, t } = useI18n()

function cardName(card) {
  return locale.value === 'en' ? card.nameEn : card.nameFr
}

function canAfford(card) {
  return (Number(card.cost) || 0) <= props.chakra
}

const fanStyle = computed(() => {
  const n = props.cards.length || 1
  return { '--hand-count': n }
})
</script>

<template>
  <div class="hand" :style="fanStyle" data-testid="combat-hand">
    <button
      v-for="(card, index) in cards"
      :key="card.instanceId"
      type="button"
      class="hand-card"
      :class="{
        'hand-card--selected': selectedId === card.instanceId,
        'hand-card--unaffordable': !canAfford(card),
        [`hand-card--${card.type}`]: true,
      }"
      :style="{ '--i': index, '--n': cards.length }"
      :disabled="disabled"
      :data-testid="`hand-card-${card.slug}`"
      @click="emit('select', card)"
      @dblclick="canAfford(card) && emit('play', card)"
    >
      <span class="hand-card__cost">{{ card.cost }}</span>
      <span class="hand-card__type">{{ t(`cards.types.${card.type}`, card.type) }}</span>
      <strong class="hand-card__name">{{ cardName(card) }}</strong>
      <span v-if="card.damage" class="hand-card__stat hand-card__stat--dmg">
        {{ t('cards.damage', { n: card.damage }) }}
      </span>
      <span v-if="card.block" class="hand-card__stat hand-card__stat--blk">
        {{ t('cards.block', { n: card.block }) }}
      </span>
      <span v-if="card.heal" class="hand-card__stat hand-card__stat--heal">
        {{ t('cards.heal', { n: card.heal }) }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.hand {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.45rem;
  min-height: 9.5rem;
  padding: 0.5rem 0.25rem 0;
  overflow-x: auto;
}

.hand-card {
  position: relative;
  flex: 0 0 auto;
  width: 7.2rem;
  min-height: 8.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.65rem 0.6rem;
  text-align: left;
  border: 1px solid color-mix(in srgb, var(--color-line) 90%, transparent);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--color-bg-card) 92%, #2a2218),
    color-mix(in srgb, var(--color-bg) 96%, transparent)
  );
  color: var(--color-ink);
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  animation: deal-in 0.4s ease backwards;
  animation-delay: calc(var(--i) * 40ms);
}

.hand-card:hover:not(:disabled),
.hand-card--selected {
  transform: translateY(-0.55rem);
  border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  z-index: 2;
}

.hand-card--unaffordable {
  opacity: 0.48;
}

.hand-card--attack {
  border-top: 2px solid color-mix(in srgb, var(--color-fire) 55%, transparent);
}

.hand-card--defense {
  border-top: 2px solid color-mix(in srgb, var(--color-water) 55%, transparent);
}

.hand-card--skill,
.hand-card--item,
.hand-card--summon {
  border-top: 2px solid color-mix(in srgb, var(--color-accent-soft) 55%, transparent);
}

.hand-card__cost {
  position: absolute;
  top: 0.35rem;
  right: 0.4rem;
  width: 1.35rem;
  height: 1.35rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1a1410;
  background: var(--color-accent);
}

.hand-card__type {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-ink-faint);
}

.hand-card__name {
  font-family: var(--font-display);
  font-size: 0.95rem;
  line-height: 1.15;
  margin-top: 0.15rem;
}

.hand-card__stat {
  margin-top: auto;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

.hand-card__stat--dmg {
  color: var(--color-fire);
}

.hand-card__stat--blk {
  color: var(--color-water);
}

.hand-card__stat--heal {
  color: var(--color-win);
}

@keyframes deal-in {
  from {
    opacity: 0;
    transform: translateY(1rem) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 640px) {
  .hand-card {
    width: 6.2rem;
    min-height: 7.8rem;
  }
}
</style>
