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
      <span class="hand-card__frame" aria-hidden="true" />
      <span class="hand-card__foil" aria-hidden="true" />

      <span class="hand-card__art-wrap">
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
        <span class="hand-card__cost" :title="t('combat.costLabel', { n: card.cost })">
          {{ card.cost }}
        </span>
        <span
          v-if="card.upgradeLevel > 0"
          class="hand-card__upgrade"
          :title="t('cards.upgraded', { level: card.upgradeLevel })"
        >
          +{{ card.upgradeLevel }}
        </span>
      </span>

      <span class="hand-card__nameplate">
        <span class="hand-card__type-icon" aria-hidden="true">
          <span class="shape" :class="`shape--${cardTypeVisual(displayType(card)).shape}`" />
        </span>
        <strong class="hand-card__name">{{ cardName(card) }}</strong>
        <span v-if="displayType(card)" class="hand-card__type">
          {{ t(`cards.types.${displayType(card)}`, displayType(card)) }}
        </span>
      </span>

      <span class="hand-card__rules">
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

      <span class="hand-card__footer" :data-tone="rarityVisual(card.rarity).tone" aria-hidden="true">
        <span class="hand-card__gem">
          <span v-for="n in rarityVisual(card.rarity).pips" :key="n" class="lozenge" />
        </span>
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
  padding: 1rem var(--space-gutter) 0.5rem;
  overflow-x: auto;
  scroll-padding-inline: var(--space-gutter);
  scroll-snap-type: x proximity;
}

.hand-card {
  --card-rarity: var(--color-neutral-fill);
  --card-rarity-soft: var(--color-bg-soft);
  --card-rarity-glow: transparent;
  --card-frame: color-mix(in srgb, var(--color-ink) 88%, var(--card-rarity));

  position: relative;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 8.75rem;
  aspect-ratio: 2.5 / 3.5;
  overflow: hidden;
  padding: 0.28rem 0.28rem 0.32rem;
  border: 0;
  border-radius: 0.7rem;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--card-rarity) 55%, var(--card-frame)) 0%,
      var(--card-frame) 40%,
      color-mix(in srgb, var(--card-rarity) 30%, var(--card-frame)) 100%
    );
  color: var(--color-ink);
  text-align: left;
  outline: 0 solid var(--color-ink);
  scroll-snap-align: start;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 40%, transparent),
    0 8px 16px color-mix(in srgb, var(--color-ink) 16%, transparent);
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    opacity var(--dur-base) ease,
    box-shadow var(--dur-base) ease,
    outline-width var(--dur-fast) ease;
}

.hand-card__frame {
  position: absolute;
  inset: 0.18rem;
  z-index: 0;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--color-bg-card) 92%, var(--card-rarity-soft));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--card-rarity) 22%, transparent);
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
  opacity: 0.5;
}

.hand-card--foil:hover .hand-card__foil,
.hand-card--selected .hand-card__foil {
  opacity: 0.85;
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

.hand-card__art-wrap,
.hand-card__nameplate,
.hand-card__rules,
.hand-card__footer {
  position: relative;
  z-index: 1;
}

.hand-card__art-wrap {
  position: relative;
  margin: 0.05rem 0.05rem 0;
}

.hand-card__art {
  display: block;
  overflow: hidden;
  aspect-ratio: 1 / 0.88;
  border: 1.5px solid color-mix(in srgb, var(--card-rarity) 50%, var(--color-ink));
  border-radius: 0.28rem 0.28rem 0.1rem 0.1rem;
  background: var(--color-bg-soft);
}

.hand-card__art--placeholder {
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  color: var(--tone-fill);
  opacity: 0.45;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--tone-fill) 30%, var(--color-bg-soft)),
      var(--color-bg-soft)
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

.hand-card__cost {
  position: absolute;
  top: -0.28rem;
  left: -0.28rem;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-gold-fill) 85%, white), var(--color-gold) 55%, color-mix(in srgb, var(--color-ink) 55%, var(--color-gold)));
  box-shadow:
    0 0 0 1.5px color-mix(in srgb, var(--color-ink) 75%, transparent),
    0 1px 4px color-mix(in srgb, var(--color-ink) 30%, transparent);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  color: var(--color-ink);
}

.hand-card--unaffordable .hand-card__cost {
  color: var(--color-fire);
  filter: saturate(0.7);
}

.hand-card__upgrade {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  z-index: 3;
  display: inline-grid;
  place-items: center;
  min-width: 1.15rem;
  height: 1.05rem;
  padding: 0 0.2rem;
  border-radius: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--color-gold-fill) 70%, transparent);
  background: color-mix(in srgb, var(--color-ink) 70%, transparent);
  font-family: var(--font-display);
  font-size: 0.6rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-on-ink);
}

.hand-card__nameplate {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 0 0.3rem;
  align-items: center;
  margin: 0.22rem 0.05rem 0;
  padding: 0.2rem 0.28rem 0.22rem;
  border-radius: 0.15rem;
  background: var(--tone-fill);
  color: var(--tone-on);
}

.hand-card__type-icon {
  grid-row: 1 / span 2;
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-ink) 25%, transparent);
  font-size: 0.6rem;
}

.hand-card__name {
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 800;
  font-stretch: 88%;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.hand-card__type {
  font-size: 0.45rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.9;
}

.hand-card__rules {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.15rem;
  min-height: 0;
  margin: 0.2rem 0.05rem 0;
  padding: 0.25rem 0.3rem;
  border-radius: 0.15rem;
  background: color-mix(in srgb, var(--color-bg-soft) 75%, var(--card-rarity-soft));
  border: 1px solid color-mix(in srgb, var(--card-rarity) 18%, var(--color-line));
}

.hand-card__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.55rem;
  line-height: 1.3;
  color: var(--color-ink-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.hand-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.4rem;
  margin-top: auto;
}

.hand-card__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.15rem;
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.hand-card__stat b {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 800;
  font-stretch: 76%;
  letter-spacing: 0;
  line-height: 0.95;
}

.hand-card__stat-label {
  display: inline-flex;
  flex-direction: column;
  gap: 0.02rem;
  line-height: 1.05;
}

.hand-card__base {
  font-size: 0.45rem;
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

.hand-card__footer {
  display: flex;
  justify-content: center;
  margin-top: 0.15rem;
  padding: 0.05rem;
}

.hand-card__gem {
  display: inline-flex;
  gap: 0.1rem;
  padding: 0.1rem 0.3rem;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--tone-fill) 90%, white), var(--tone-fill));
  font-size: 0.4rem;
  color: var(--tone-on, var(--color-on-ink));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-ink) 40%, transparent);
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
    width: 7.85rem;
  }
}
</style>
