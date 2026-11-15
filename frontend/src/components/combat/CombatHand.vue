<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardTypeVisual } from '../../utils/cardVisuals'
import { localizedDescription, localizedName } from '../../utils/localeContent.js'

defineOptions({ name: 'CombatHand' })

const props = defineProps({
  cards: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  chakra: { type: Number, default: 0 },
})

const emit = defineEmits(['select', 'play'])

const { locale, t } = useI18n()

function cardName(card) {
  return localizedName(card, locale.value)
}

function cardDescription(card) {
  return localizedDescription(card, locale.value)
}

/** Fige la carte sortante à sa place pour que les autres glissent sans saut. */
function pinLeaving(el) {
  el.style.left = `${el.offsetLeft}px`
  el.style.top = `${el.offsetTop}px`
  el.style.width = `${el.offsetWidth}px`
  el.style.height = `${el.offsetHeight}px`
}

function canAfford(card) {
  return (Number(card.cost) || 0) <= props.chakra
}

const fanStyle = computed(() => {
  const n = props.cards.length || 1
  return { '--hand-count': n }
})
/* Les cartes d'un duel PvP n'ont pas de type : on le déduit de leur effet, pour l'affichage seulement. */
function displayType(card) {
  if (card.type) return card.type
  if (card.damage) return 'attack'
  if (card.block) return 'defense'
  if (card.heal) return 'skill'
  return null
}
</script>

<template>
  <TransitionGroup
    tag="div"
    name="hand"
    class="hand"
    :style="fanStyle"
    data-testid="combat-hand"
    @before-leave="pinLeaving"
  >
    <button
      v-for="(card, index) in cards"
      :key="card.instanceId"
      type="button"
      class="hand-card"
      :class="{
        'hand-card--selected': selectedId === card.instanceId,
        'hand-card--unaffordable': !canAfford(card),
        [`hand-card--${displayType(card) || 'untyped'}`]: true,
      }"
      :style="{ '--i': index, '--n': cards.length }"
      :disabled="disabled"
      :aria-pressed="selectedId === card.instanceId"
      :data-tone="cardTypeVisual(displayType(card)).tone"
      :data-testid="`hand-card-${card.slug}`"
      @click="emit('select', card)"
      @dblclick="canAfford(card) && emit('play', card)"
    >
      <span class="hand-card__band">
        <span class="hand-card__cost" :title="t('combat.costLabel', { n: card.cost })">{{ card.cost }}</span>
        <span class="hand-card__type">
          <span class="shape" :class="`shape--${cardTypeVisual(displayType(card)).shape}`" aria-hidden="true" />
          <template v-if="displayType(card)">{{ t(`cards.types.${displayType(card)}`, displayType(card)) }}</template>
        </span>
      </span>
      <span class="hand-card__body">
        <strong class="hand-card__name">{{ cardName(card) }}</strong>
        <span v-if="cardDescription(card)" class="hand-card__desc">{{ cardDescription(card) }}</span>
        <span class="hand-card__stats">
          <span v-if="card.damage" class="hand-card__stat hand-card__stat--dmg" :title="t('cards.damage', { n: card.damage })">
            <b>{{ card.damage }}</b> {{ t('cards.statDamage') }}
          </span>
          <span v-if="card.block" class="hand-card__stat hand-card__stat--blk" :title="t('cards.block', { n: card.block })">
            <b>{{ card.block }}</b> {{ t('cards.statBlock') }}
          </span>
          <span v-if="card.heal" class="hand-card__stat hand-card__stat--heal" :title="t('cards.heal', { n: card.heal })">
            <b>{{ card.heal }}</b> {{ t('cards.statHeal') }}
          </span>
        </span>
      </span>
    </button>
  </TransitionGroup>
</template>

<style scoped>
.hand {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0.6rem;
  min-height: 12.5rem;
  margin-inline: calc(var(--space-gutter) * -1);
  padding: 1rem var(--space-gutter) 0.5rem;
  overflow-x: auto;
  scroll-padding-inline: var(--space-gutter);
  scroll-snap-type: x proximity;
}

.hand-card {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 9.25rem;
  min-height: 11.25rem;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-ink);
  text-align: left;
  outline: 0 solid var(--color-ink);
  scroll-snap-align: start;
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    opacity var(--dur-base) ease,
    outline-width var(--dur-fast) ease;
}

.hand-card:hover:not(:disabled) {
  transform: translateY(-0.5rem);
}

.hand-card--selected,
.hand-card--selected:hover:not(:disabled) {
  outline-width: 3px;
  transform: translateY(-0.75rem);
}

.hand-card:disabled {
  cursor: default;
}

.hand-card--unaffordable {
  opacity: 0.5;
}

.hand-card__band {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.25rem;
  padding-right: 0.5rem;
  background: var(--tone-fill);
  color: var(--tone-on);
}

.hand-card__cost {
  display: grid;
  place-items: center;
  align-self: stretch;
  min-width: 2.25rem;
  padding-right: 0.3rem;
  background: var(--color-bg-card);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  color: var(--color-ink);
  clip-path: polygon(0 0, 100% 0, 80% 100%, 0 100%);
}

.hand-card--unaffordable .hand-card__cost {
  color: var(--color-fire);
}

.hand-card__type {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.hand-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0.65rem 0.65rem;
}

.hand-card__name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.hand-card__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--color-ink-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
}

.hand-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.6rem;
  margin-top: auto;
}

.hand-card__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.hand-card__stat b {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  font-stretch: 76%;
  letter-spacing: 0;
  line-height: 0.95;
}

.hand-card__stat--dmg b {
  color: var(--color-accent);
}

.hand-card__stat--blk b {
  color: var(--color-indigo);
}

.hand-card__stat--heal b {
  color: var(--color-leaf);
}

/* Distribution, carte jouée, glissement des cartes restantes */
.hand-enter-active {
  transition:
    opacity 320ms ease,
    transform 380ms var(--ease-out-quint);
  transition-delay: calc(var(--i) * 45ms);
}

.hand-enter-from {
  opacity: 0;
  transform: translateY(1.75rem) rotate(2deg);
}

.hand-leave-active {
  position: absolute;
  z-index: 3;
  transition:
    opacity 240ms ease-in,
    transform 280ms ease-in;
}

.hand-leave-to {
  opacity: 0;
  transform: translateY(-3.5rem) scale(0.92);
}

.hand-move {
  transition: transform 320ms var(--ease-out-quint);
}

@media (min-width: 900px) {
  .hand {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .hand-card {
    width: 8.25rem;
  }
}
</style>
