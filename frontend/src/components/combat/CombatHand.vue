<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveCardArt } from '../../utils/cardArt'
import { cardEffectParts } from '../../utils/cardEffectLine'
import { cardFooterCells } from '../../utils/cardFooterStats'
import { cardTypeVisual, rarityVisual, statTone } from '../../utils/cardVisuals'
import { localizedName } from '../../utils/localeContent.js'
import { scalingStatKey } from '../../utils/cardScaling'

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

const { locale, t, te } = useI18n()

function cardName(card) {
  return localizedName(card, locale.value)
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

function effectParts(card) {
  return cardEffectParts(card, props.stats, { t, te, locale: locale.value })
}

function effectLine(card) {
  return effectParts(card).texts.join(' · ')
}

function effectTitle(card) {
  return effectParts(card).aria.join(' · ')
}

function scaleStat(card) {
  for (const key of ['damage', 'block', 'heal']) {
    if (!(Number(card[key]) > 0)) continue
    const statKey = scalingStatKey(card, key)
    if (!statKey) continue
    return {
      key: statKey,
      label: t(`cards.stats.${statKey}`, statKey),
      tone: statTone(statKey),
    }
  }
  if (!card.statType) return null
  return {
    key: card.statType,
    label: t(`cards.stats.${card.statType}`, card.statType),
    tone: statTone(card.statType),
  }
}

function rarityKey(card) {
  return card.rarity || 'common'
}

function cardArt(card) {
  return resolveCardArt(card)
}

function footerCells(card) {
  return cardFooterCells(card)
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
        'hand-card--has-scale': Boolean(scaleStat(card)),
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

      <span class="hand-card__shell">
        <span v-if="cardArt(card)" class="hand-card__art" aria-hidden="true">
          <img
            class="hand-card__art-img"
            :src="cardArt(card)"
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </span>
        <span v-else class="hand-card__art hand-card__art--placeholder" aria-hidden="true">
          <span
            class="shape"
            :class="`shape--${cardTypeVisual(displayType(card)).shape}`"
          />
        </span>

        <span class="hand-card__body">
          <strong class="hand-card__name">{{ cardName(card) }}</strong>
          <span v-if="displayType(card)" class="hand-card__type">
            {{ t(`cards.types.${displayType(card)}`, displayType(card)) }}
          </span>
          <span
            v-if="effectLine(card)"
            class="hand-card__effect"
            :title="effectTitle(card)"
          >
            {{ effectLine(card) }}
          </span>
        </span>

        <span class="hand-card__footer" aria-hidden="true">
          <span
            v-for="cell in footerCells(card)"
            :key="cell.key"
            class="hand-card__stat"
            :data-tone="cell.tone"
          >
            <span v-if="cell.show">{{ cell.value }}</span>
          </span>
        </span>
      </span>

      <span class="hand-card__cost" :title="t('combat.costLabel', { n: card.cost })">
        <span class="hand-card__cost-face" aria-hidden="true" />
        <span class="hand-card__cost-value">{{ card.cost }}</span>
      </span>

      <span
        v-if="scaleStat(card)"
        class="hand-card__scale"
        :data-tone="scaleStat(card).tone"
        :title="t('cards.scalesWith', { stat: scaleStat(card).label })"
      >
        {{ scaleStat(card).label }}
      </span>

      <span
        v-if="card.upgradeLevel > 0"
        class="hand-card__upgrade"
        :title="t('cards.upgraded', { level: card.upgradeLevel })"
      >
        +{{ card.upgradeLevel }}
      </span>
    </button>
  </TransitionGroup>
</template>

<style scoped>
.hand {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 0.55rem;
  min-height: 14.5rem;
  margin-inline: calc(var(--space-gutter) * -1);
  padding: 1rem var(--space-gutter) 0.75rem;
  overflow-x: auto;
  scroll-padding-inline: var(--space-gutter);
  scroll-snap-type: x proximity;
}

.hand-card {
  --card-rarity: var(--color-neutral-fill);
  --card-rarity-glow: transparent;
  --card-body-bg: color-mix(in srgb, var(--color-ink) 94%, var(--color-bg));
  --card-body-fg: var(--color-on-ink);
  --card-body-muted: color-mix(in srgb, var(--color-on-ink) 55%, transparent);

  position: relative;
  display: block;
  flex: 0 0 auto;
  width: 8.75rem;
  aspect-ratio: 2.5 / 3.5;
  padding: 0;
  border: 2px solid var(--card-rarity);
  border-radius: 0.55rem;
  background: var(--card-body-bg);
  color: var(--card-body-fg);
  text-align: left;
  outline: 0 solid var(--color-ink);
  overflow: visible;
  scroll-snap-align: start;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 35%, transparent),
    0 8px 16px color-mix(in srgb, var(--color-ink) 16%, transparent);
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    opacity var(--dur-base) ease,
    box-shadow var(--dur-base) ease,
    outline-width var(--dur-fast) ease;
}

.hand-card__shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(0.55rem - 2px);
}

.hand-card--common {
  --card-rarity: var(--color-neutral-fill);
}

.hand-card--rare {
  --card-rarity: var(--color-sky-fill);
  --card-rarity-glow: color-mix(in srgb, var(--color-sky-fill) 30%, transparent);
}

.hand-card--legendary {
  --card-rarity: var(--color-gold-fill);
  --card-rarity-glow: color-mix(in srgb, var(--color-gold-fill) 35%, transparent);
}

.hand-card--mythic {
  --card-rarity: var(--color-vermilion);
  --card-rarity-glow: color-mix(in srgb, var(--color-vermilion) 38%, transparent);
}

.hand-card__foil {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  border-radius: inherit;
  background:
    linear-gradient(
      125deg,
      transparent 20%,
      color-mix(in srgb, var(--card-rarity) 18%, transparent) 40%,
      color-mix(in srgb, var(--color-on-ink) 22%, transparent) 50%,
      color-mix(in srgb, var(--card-rarity) 22%, transparent) 60%,
      transparent 80%
    );
  background-size: 220% 220%;
  mix-blend-mode: soft-light;
}

.hand-card--foil .hand-card__foil {
  opacity: 0.45;
}

.hand-card--foil:hover .hand-card__foil,
.hand-card--selected .hand-card__foil {
  opacity: 0.8;
  animation: hand-foil-sweep 1.4s var(--ease-out-quint) 1;
}

.hand-card:hover:not(:disabled) {
  transform: translateY(-0.55rem);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 55%, transparent),
    0 12px 20px color-mix(in srgb, var(--color-ink) 20%, transparent),
    0 0 14px var(--card-rarity-glow);
}

.hand-card--selected,
.hand-card--selected:hover:not(:disabled) {
  outline-width: 3px;
  transform: translateY(-0.85rem);
}

.hand-card:disabled {
  cursor: default;
}

.hand-card--unaffordable {
  opacity: 0.5;
}

.hand-card__art {
  display: block;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: var(--card-body-bg);
}

.hand-card__art--placeholder {
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  color: var(--tone-fill);
  opacity: 0.4;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--tone-fill) 30%, var(--card-body-bg)),
      var(--card-body-bg)
    );
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

.hand-card__body {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  height: 3.85rem;
  padding: 0.32rem 0.4rem 0.35rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-ink) 12%, transparent);
  background: var(--card-body-bg);
}

.hand-card__name {
  font-family: var(--font-display);
  font-size: 0.68rem;
  font-weight: 700;
  font-stretch: 92%;
  line-height: 1.05;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hand-card__type {
  font-size: 0.42rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--card-body-muted);
}

.hand-card__effect {
  margin-top: 0.08rem;
  padding-top: 0.18rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-ink) 12%, transparent);
  font-size: 0.55rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--card-body-fg);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hand-card__footer {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  height: 1.1rem;
}

.hand-card__stat {
  display: grid;
  place-items: center;
  background: var(--tone-fill);
  font-family: var(--font-display);
  font-size: 0.55rem;
  font-weight: 800;
  line-height: 1;
  color: #fff;
}

.hand-card__cost {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  z-index: 4;
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
}

.hand-card__cost-face {
  position: absolute;
  inset: 0;
  transform: rotate(45deg);
  border-radius: 0.15rem;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-ink) 55%, var(--color-bg-soft)),
      color-mix(in srgb, var(--color-ink) 88%, black)
    );
  box-shadow:
    0 0 0 1.5px color-mix(in srgb, var(--card-rarity) 70%, var(--color-on-ink)),
    0 1px 4px color-mix(in srgb, var(--color-ink) 30%, transparent);
}

.hand-card__cost-value {
  position: relative;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  color: #fff;
}

.hand-card--unaffordable .hand-card__cost-value {
  color: var(--color-fire);
}

.hand-card__scale {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  z-index: 4;
  max-width: 4.2rem;
  padding: 0.12rem 0.38rem;
  border-radius: 999px;
  background: var(--tone-fill, var(--color-neutral-fill));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-on-ink) 25%, transparent),
    0 1px 4px color-mix(in srgb, var(--color-ink) 25%, transparent);
  font-size: 0.38rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.15;
  color: #fff;
  text-shadow: 0 1px 1px color-mix(in srgb, #000 40%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hand-card__upgrade {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  z-index: 4;
  display: inline-grid;
  place-items: center;
  min-width: 1.1rem;
  height: 1rem;
  padding: 0 0.18rem;
  border-radius: 0.15rem;
  border: 1px solid color-mix(in srgb, var(--color-gold-fill) 70%, transparent);
  background: color-mix(in srgb, var(--color-ink) 70%, transparent);
  font-family: var(--font-display);
  font-size: 0.55rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-on-ink);
}

.hand-card--has-scale .hand-card__upgrade {
  top: 1.55rem;
}

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
    width: 7.85rem;
  }
}
</style>
