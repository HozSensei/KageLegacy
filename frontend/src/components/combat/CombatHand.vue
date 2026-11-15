<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveCardArt } from '../../utils/cardArt'
import { cardTypeVisual, rarityVisual } from '../../utils/cardVisuals'
import { localizedDescription, localizedName } from '../../utils/localeContent.js'
import { previewCardFigures } from '../../utils/cardScaling'

defineOptions({ name: 'CombatHand' })

const props = defineProps({
  cards: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  chakra: { type: Number, default: 0 },
  /** Snapshot stats combat — figures affichées en valeur effective. */
  stats: { type: Object, default: null },
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

function cardFigures(card) {
  return previewCardFigures(card, props.stats).map((entry) => {
    const labelKey =
      entry.key === 'damage'
        ? 'cards.statDamage'
        : entry.key === 'block'
          ? 'cards.statBlock'
          : 'cards.statHeal'
    const fullKey =
      entry.key === 'damage'
        ? 'cards.damage'
        : entry.key === 'block'
          ? 'cards.block'
          : 'cards.heal'
    const title = entry.scaled
      ? t('cards.statEffectiveAria', {
          n: entry.effective,
          base: entry.base,
          stat: t(`cards.stats.${entry.statKey}`, entry.statKey),
        })
      : t(fullKey, { n: entry.effective })
    return {
      ...entry,
      label: t(labelKey),
      title,
      modClass:
        entry.key === 'damage'
          ? 'hand-card__stat--dmg'
          : entry.key === 'block'
            ? 'hand-card__stat--blk'
            : 'hand-card__stat--heal',
    }
  })
}

function rarityKey(card) {
  return card.rarity || 'common'
}

function cardArt(card) {
  return resolveCardArt(card)
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
        [`hand-card--${rarityKey(card)}`]: true,
        'hand-card--foil': rarityVisual(card.rarity).foil,
      }"
      :style="{ '--i': index, '--n': cards.length }"
      :disabled="disabled"
      :aria-pressed="selectedId === card.instanceId"
      :data-tone="cardTypeVisual(displayType(card)).tone"
      :data-rarity="rarityKey(card)"
      :data-testid="`hand-card-${card.slug}`"
      @click="emit('select', card)"
      @dblclick="canAfford(card) && emit('play', card)"
    >
      <span class="hand-card__foil" aria-hidden="true" />
      <span class="hand-card__rarity-edge" aria-hidden="true" />
      <span class="hand-card__band">
        <span class="hand-card__cost" :title="t('combat.costLabel', { n: card.cost })">{{ card.cost }}</span>
        <span class="hand-card__type">
          <span class="shape" :class="`shape--${cardTypeVisual(displayType(card)).shape}`" aria-hidden="true" />
          <template v-if="displayType(card)">{{ t(`cards.types.${displayType(card)}`, displayType(card)) }}</template>
        </span>
        <span
          v-if="card.upgradeLevel > 0"
          class="hand-card__upgrade"
          :title="t('cards.upgraded', { level: card.upgradeLevel })"
        >
          +{{ card.upgradeLevel }}
        </span>
      </span>
      <span
        class="hand-card__rarity"
        :data-tone="rarityVisual(card.rarity).tone"
      >
        <span class="hand-card__pips" aria-hidden="true">
          <span v-for="n in rarityVisual(card.rarity).pips" :key="n" class="lozenge" />
        </span>
      </span>
      <span class="hand-card__body">
        <span v-if="cardArt(card)" class="hand-card__art" aria-hidden="true">
          <img class="hand-card__art-img" :src="cardArt(card)" alt="" loading="lazy" decoding="async" draggable="false" />
        </span>
        <strong class="hand-card__name">{{ cardName(card) }}</strong>
        <span v-if="cardDescription(card)" class="hand-card__desc">{{ cardDescription(card) }}</span>
        <span class="hand-card__stats">
          <span
            v-for="entry in cardFigures(card)"
            :key="entry.key"
            class="hand-card__stat"
            :class="entry.modClass"
            :title="entry.title"
          >
            <b>{{ entry.effective }}</b>
            <span class="hand-card__stat-label">
              {{ entry.label }}
              <small v-if="entry.scaled" class="hand-card__base">{{ t('cards.baseShort', { n: entry.base }) }}</small>
            </span>
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
  --card-rarity: var(--color-neutral-fill);
  --card-rarity-soft: var(--color-bg-soft);
  --card-rarity-glow: transparent;

  position: relative;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 9.5rem;
  min-height: 11.5rem;
  overflow: hidden;
  border: 2px solid var(--card-rarity);
  border-radius: var(--radius-md);
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--card-rarity-soft) 50%, var(--color-bg-card)) 0%,
      var(--color-bg-card) 45%,
      var(--color-bg-card) 100%
    );
  color: var(--color-ink);
  text-align: left;
  outline: 0 solid var(--color-ink);
  scroll-snap-align: start;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--card-rarity) 24%, transparent);
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    opacity var(--dur-base) ease,
    box-shadow var(--dur-base) ease,
    outline-width var(--dur-fast) ease;
}

.hand-card--common {
  --card-rarity: var(--color-neutral-fill);
}

.hand-card--rare {
  --card-rarity: var(--color-sky);
  --card-rarity-soft: var(--color-sky-tint);
  --card-rarity-glow: color-mix(in srgb, var(--color-sky-fill) 30%, transparent);
}

.hand-card--legendary {
  --card-rarity: var(--color-gold);
  --card-rarity-soft: var(--color-gold-tint);
  --card-rarity-glow: color-mix(in srgb, var(--color-gold-fill) 35%, transparent);
}

.hand-card--mythic {
  --card-rarity: var(--color-vermilion);
  --card-rarity-soft: var(--color-vermilion-tint);
  --card-rarity-glow: color-mix(in srgb, var(--color-vermilion) 38%, transparent);
  border-width: 3px;
}

.hand-card__foil {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  background:
    linear-gradient(
      125deg,
      transparent 20%,
      color-mix(in srgb, var(--card-rarity) 16%, transparent) 40%,
      color-mix(in srgb, var(--color-bg-card) 50%, transparent) 50%,
      color-mix(in srgb, var(--card-rarity) 20%, transparent) 60%,
      transparent 80%
    );
  background-size: 220% 220%;
}

.hand-card--foil .hand-card__foil {
  opacity: 0.5;
}

.hand-card--foil:hover .hand-card__foil,
.hand-card--selected .hand-card__foil {
  opacity: 0.8;
  animation: hand-foil-sweep 1.4s var(--ease-out-quint) 1;
}

.hand-card__rarity-edge {
  pointer-events: none;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  width: 0.22rem;
  background: var(--card-rarity);
  box-shadow: 0 0 10px var(--card-rarity-glow);
}

.hand-card:hover:not(:disabled) {
  transform: translateY(-0.5rem);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--card-rarity) 40%, transparent),
    0 8px 16px color-mix(in srgb, var(--color-ink) 12%, transparent);
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

.hand-card__band,
.hand-card__rarity,
.hand-card__body {
  position: relative;
  z-index: 1;
}

.hand-card__band {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding-right: 0.45rem;
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
  gap: 0.3rem;
  min-width: 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.hand-card__upgrade {
  margin-left: auto;
  display: inline-grid;
  place-items: center;
  min-width: 1.35rem;
  height: 1.2rem;
  padding: 0 0.25rem;
  border: 1px solid color-mix(in srgb, var(--tone-on) 50%, transparent);
  background: color-mix(in srgb, var(--color-ink) 50%, transparent);
  font-family: var(--font-display);
  font-size: 0.6875rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-on-ink);
}

.hand-card__rarity {
  display: flex;
  align-items: center;
  min-height: 0.85rem;
  padding: 0.2rem 0.55rem 0.15rem 0.7rem;
  background: color-mix(in srgb, var(--tone-fill) 20%, var(--color-bg-soft));
  border-bottom: 1px solid color-mix(in srgb, var(--card-rarity) 30%, transparent);
}

.hand-card__pips {
  display: inline-flex;
  gap: 0.15rem;
  font-size: 0.65rem;
  color: var(--tone-fill);
}

.hand-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.55rem 0.6rem 0.6rem 0.7rem;
}

.hand-card__art {
  overflow: hidden;
  margin: 0 -0.1rem;
  border: 1px solid color-mix(in srgb, var(--card-rarity) 30%, var(--color-line));
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
}

.hand-card__art-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  user-select: none;
  pointer-events: none;
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
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--color-ink-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.hand-card:has(.hand-card__art) .hand-card__desc {
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.hand-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.55rem;
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

.hand-card__stat-label {
  display: inline-flex;
  flex-direction: column;
  gap: 0.05rem;
  line-height: 1.1;
}

.hand-card__base {
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-ink-faint);
  text-transform: uppercase;
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

@keyframes hand-foil-sweep {
  from {
    background-position: 120% 40%;
  }
  to {
    background-position: -20% 60%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hand-card--foil:hover .hand-card__foil,
  .hand-card--selected .hand-card__foil {
    animation: none;
  }
}

@media (min-width: 900px) {
  .hand {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .hand-card {
    width: 8.4rem;
  }
}
</style>
