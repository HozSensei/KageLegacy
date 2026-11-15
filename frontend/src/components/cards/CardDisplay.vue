<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveCardArt } from '../../utils/cardArt'
import { cardEffectParts } from '../../utils/cardEffectLine'
import { cardFooterCells } from '../../utils/cardFooterStats'
import {
  cardTypeVisual,
  elementLabelKey,
  elementTone,
  rarityVisual,
  statTone,
} from '../../utils/cardVisuals'
import { localizedName } from '../../utils/localeContent.js'
import { scalingStatKey } from '../../utils/cardScaling'

defineOptions({ name: 'CardDisplay' })

const props = defineProps({
  card: { type: Object, required: true },
  quantity: { type: Number, default: null },
  upgradeLevel: { type: Number, default: 0 },
  /** Numéro catalogue 1-based (#1…) — affiché en collection. */
  catalogueNumber: { type: Number, default: null },
  selected: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  /** Stats du ninja : si fournies, les figures affichent la valeur effective. */
  stats: { type: Object, default: null },
})

defineEmits(['select'])

const { t, te, locale } = useI18n()

const name = computed(() => localizedName(props.card, locale.value))

const rarityKey = computed(() => props.card.rarity || 'common')
const rarityClass = computed(() => `card-display--${rarityKey.value}`)

const typeLabel = computed(() => t(`cards.types.${props.card.type}`, props.card.type))
const typeVisual = computed(() => cardTypeVisual(props.card.type))
const rarity = computed(() => rarityVisual(props.card.rarity))

const elementLabel = computed(() => {
  const key = elementLabelKey(props.card.element)
  if (!key) return ''
  return te(key) ? t(key) : props.card.element
})

const effectParts = computed(() =>
  cardEffectParts(props.card, props.stats, { t, te, locale: locale.value }),
)

const effectLine = computed(() => effectParts.value.texts.join(' · '))

/**
 * Catégorie de scaling / chakra — capsule colorée à gauche.
 * Préfère la stat qui scale une figure, sinon `statType` de la carte.
 */
const scaleStat = computed(() => {
  for (const key of ['damage', 'block', 'heal']) {
    if (!(Number(props.card[key]) > 0)) continue
    const statKey = scalingStatKey(props.card, key)
    if (!statKey) continue
    return {
      key: statKey,
      label: t('cards.scaleStat', { stat: t(`cards.stats.${statKey}`, statKey) }),
      tone: statTone(statKey),
    }
  }
  const fallback = props.card.statType
  if (!fallback) return null
  return {
    key: fallback,
    label: t('cards.scaleStat', { stat: t(`cards.stats.${fallback}`, fallback) }),
    tone: statTone(fallback),
  }
})

const footerCells = computed(() => cardFooterCells(props.card))

const artUrl = computed(() => resolveCardArt(props.card))
const cost = computed(() => props.card.cost ?? props.card.baseCost ?? 0)
</script>

<template>
  <button
    type="button"
    class="card-display"
    :class="[
      rarityClass,
      {
        'card-display--selected': selected,
        'card-display--compact': compact,
        'card-display--foil': rarity.foil,
        'card-display--no-art': !artUrl,
        'card-display--has-scale': Boolean(scaleStat),
      },
    ]"
    :data-tone="typeVisual.tone"
    :data-rarity="rarityKey"
    :aria-pressed="selected"
    data-testid="card-display"
    @click="$emit('select', card)"
  >
    <span class="card-display__foil" aria-hidden="true" />

    <div class="card-display__shell">
      <!-- Illustration plein bord -->
      <div
        class="card-display__art"
        :class="{ 'card-display__art--placeholder': !artUrl }"
        data-testid="card-art"
      >
        <img
          v-if="artUrl"
          class="card-display__art-img"
          :src="artUrl"
          :alt="name"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <span v-else class="card-display__art-fallback" aria-hidden="true">
          <span class="shape" :class="`shape--${typeVisual.shape}`" />
        </span>
      </div>

      <!-- Zone texte fixe aérée -->
      <div class="card-display__body">
        <h3 class="card-display__name">{{ name }}</h3>
        <p class="card-display__meta">
          <span class="card-display__type">{{ typeLabel }}</span>
          <template v-if="elementLabel">
            <span class="card-display__meta-sep" aria-hidden="true">·</span>
            <span
              class="card-display__element"
              :data-tone="elementTone(card.element)"
            >
              {{ elementLabel }}
            </span>
          </template>
        </p>
        <p
          v-if="effectLine"
          class="card-display__effect"
          :aria-label="effectParts.aria.join(', ')"
        >
          {{ effectLine }}
        </p>
      </div>

      <!-- Footer stats plein bord -->
      <footer class="card-display__footer" :aria-label="t('cards.passiveBonus')">
        <span
          v-for="cell in footerCells"
          :key="cell.key"
          class="card-display__stat"
          :data-tone="cell.tone"
          :data-stat="cell.key"
          :title="t(`cards.stats.${cell.key}`, cell.key)"
          :aria-label="
            cell.show
              ? `${t(`cards.stats.${cell.key}`, cell.key)} +${cell.value}`
              : t(`cards.stats.${cell.key}`, cell.key)
          "
        >
          <span v-if="cell.show" class="card-display__stat-value">{{ cell.value }}</span>
        </span>
      </footer>
    </div>

    <!-- Losange coût (déborde) -->
    <span class="card-display__cost" :title="t('cards.costLabel')" data-testid="card-cost">
      <span class="card-display__cost-face" aria-hidden="true" />
      <span class="card-display__cost-value">{{ cost }}</span>
    </span>

    <!-- Catégorie scaling — capsule gauche -->
    <span
      v-if="scaleStat"
      class="card-display__scale"
      data-testid="card-scale-hint"
      :data-tone="scaleStat.tone"
      :title="t('cards.scalesWith', { stat: scaleStat.label })"
    >
      {{ scaleStat.label }}
    </span>

    <span v-if="quantity != null" class="card-display__qty" :title="t('cards.quantityLabel')">
      ×{{ quantity }}
    </span>
    <span
      v-if="upgradeLevel > 0"
      class="card-display__upgrade"
      :title="t('cards.upgraded', { level: upgradeLevel })"
    >
      +{{ upgradeLevel }}
    </span>
    <span
      v-if="catalogueNumber != null"
      class="card-display__catalogue-n"
      data-testid="card-catalogue-number"
      :title="t('cards.catalogueNumberLabel', { n: catalogueNumber })"
    >
      #{{ catalogueNumber }}
    </span>
  </button>
</template>

<style scoped>
.card-display {
  --card-rarity: var(--color-line-strong);
  --card-rarity-glow: transparent;
  --card-body-bg: color-mix(in srgb, var(--color-ink) 94%, var(--color-bg));
  --card-body-fg: var(--color-on-ink);
  --card-body-muted: color-mix(in srgb, var(--color-on-ink) 58%, transparent);
  --card-border: 2.5px;

  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  aspect-ratio: 2.5 / 3.5;
  padding: 0;
  border: var(--card-border) solid var(--card-rarity);
  border-radius: 0.7rem;
  background: var(--card-body-bg);
  color: var(--card-body-fg);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 35%, transparent),
    0 10px 22px color-mix(in srgb, var(--color-ink) 16%, transparent);
  text-align: left;
  outline: 0 solid var(--color-ink);
  overflow: visible;
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    box-shadow var(--dur-base) ease,
    outline-width var(--dur-fast) ease;
}

.card-display__shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(0.7rem - var(--card-border));
}

.card-display--common {
  --card-rarity: var(--color-neutral-fill);
}

.card-display--rare {
  --card-rarity: var(--color-sky-fill);
  --card-rarity-glow: color-mix(in srgb, var(--color-sky-fill) 35%, transparent);
}

.card-display--legendary {
  --card-rarity: var(--color-gold-fill);
  --card-rarity-glow: color-mix(in srgb, var(--color-gold-fill) 40%, transparent);
}

.card-display--mythic {
  --card-rarity: var(--color-vermilion);
  --card-rarity-glow: color-mix(in srgb, var(--color-vermilion) 42%, transparent);
}

.card-display__foil {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  border-radius: inherit;
  background:
    linear-gradient(
      125deg,
      transparent 18%,
      color-mix(in srgb, var(--card-rarity) 22%, transparent) 36%,
      color-mix(in srgb, var(--color-on-ink) 28%, transparent) 48%,
      color-mix(in srgb, var(--card-rarity) 26%, transparent) 58%,
      transparent 78%
    );
  background-size: 220% 220%;
  mix-blend-mode: soft-light;
  transition: opacity var(--dur-base) ease;
}

.card-display--foil .card-display__foil {
  opacity: 0.45;
}

.card-display--foil:hover .card-display__foil,
.card-display--selected .card-display__foil {
  opacity: 0.8;
  animation: card-foil-sweep 1.6s var(--ease-out-quint) 1;
}

.card-display:hover {
  transform: translateY(-4px);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 55%, transparent),
    0 14px 26px color-mix(in srgb, var(--color-ink) 20%, transparent),
    0 0 16px var(--card-rarity-glow);
}

.card-display:active {
  transform: translateY(-1px);
}

.card-display--selected,
.card-display--selected:hover {
  outline-width: 3px;
  transform: translateY(-4px);
}

.card-display:focus-visible {
  outline: 3px solid var(--color-indigo);
  outline-offset: 3px;
}

/* Art plein bord — flush top/left/right of rarity border */
.card-display__art {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--tone-fill) 35%, var(--card-body-bg)) 0%,
      var(--card-body-bg) 100%
    );
}

.card-display__art--placeholder {
  display: grid;
  place-items: center;
}

.card-display__art-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  user-select: none;
}

.card-display__art-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 2.75rem;
  color: var(--tone-fill);
  opacity: 0.45;
}

/* Zone texte hauteur fixe */
.card-display__body {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.28rem;
  height: 5.6rem;
  padding: 0.55rem 0.7rem 0.6rem;
  background: var(--card-body-bg);
  border-top: 1px solid color-mix(in srgb, var(--color-on-ink) 12%, transparent);
}

.card-display__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  font-stretch: 92%;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--card-body-fg);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-display__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.4rem;
  margin: 0;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--card-body-muted);
}

.card-display__meta-sep {
  opacity: 0.7;
}

.card-display__effect {
  margin: 0.1rem 0 0;
  padding-top: 0.35rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-ink) 14%, transparent);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--card-body-fg);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Footer plein bord */
.card-display__footer {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  flex: 0 0 auto;
  height: 1.65rem;
  margin: 0;
  padding: 0;
  gap: 0;
}

.card-display__stat {
  display: grid;
  place-items: center;
  min-width: 0;
  background: var(--tone-fill);
  color: var(--tone-on, var(--color-on-ink));
}

.card-display__stat-value {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 1px color-mix(in srgb, #000 45%, transparent);
}

/* Losange coût — déborde coin haut droit */
.card-display__cost {
  position: absolute;
  top: -0.45rem;
  right: -0.45rem;
  z-index: 4;
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
}

.card-display__cost-face {
  position: absolute;
  inset: 0;
  transform: rotate(45deg);
  border-radius: 0.22rem;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-ink) 55%, var(--color-bg-soft)),
      color-mix(in srgb, var(--color-ink) 88%, black)
    );
  box-shadow:
    0 0 0 1.5px color-mix(in srgb, var(--card-rarity) 70%, var(--color-on-ink)),
    0 2px 6px color-mix(in srgb, var(--color-ink) 35%, transparent);
}

.card-display__cost-value {
  position: relative;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fff;
}

/* Capsule catégorie chakra — gauche, teinte de la stat */
.card-display__scale {
  position: absolute;
  top: 0.4rem;
  left: 0.35rem;
  z-index: 4;
  max-width: 5.5rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--tone-fill, var(--color-neutral-fill));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-on-ink) 28%, transparent),
    0 2px 6px color-mix(in srgb, var(--color-ink) 28%, transparent);
  font-size: 0.52rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.15;
  color: #fff;
  text-shadow: 0 1px 1px color-mix(in srgb, #000 40%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-display__qty,
.card-display__upgrade {
  position: absolute;
  z-index: 4;
  display: inline-grid;
  place-items: center;
  min-width: 1.45rem;
  height: 1.25rem;
  padding: 0 0.28rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--color-ink) 78%, transparent);
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1;
  color: var(--color-on-ink);
}

.card-display__qty {
  top: 0.35rem;
  left: 0.35rem;
}

.card-display__upgrade {
  top: 0.35rem;
  left: 2rem;
  border: 1px solid color-mix(in srgb, var(--color-gold-fill) 70%, transparent);
}

/* Quantité / upgrade sous la capsule catégorie */
.card-display--has-scale .card-display__qty,
.card-display--has-scale .card-display__upgrade {
  top: 2.05rem;
}

.card-display__catalogue-n {
  position: absolute;
  z-index: 4;
  /* Coin bas-gauche de la zone art, au-dessus du corps texte */
  bottom: calc(5.6rem + 1.65rem + 0.35rem);
  left: 0.45rem;
  padding: 0.12rem 0.28rem;
  border-radius: 0.15rem;
  background: color-mix(in srgb, var(--color-ink) 55%, transparent);
  font-family: var(--font-display);
  font-size: 0.58rem;
  font-weight: 700;
  font-stretch: 85%;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1;
  color: color-mix(in srgb, var(--color-on-ink) 78%, transparent);
  pointer-events: none;
  user-select: none;
}

.card-display--compact .card-display__catalogue-n {
  bottom: calc(4.6rem + 1.35rem + 0.3rem);
  left: 0.35rem;
  font-size: 0.5rem;
}

.card-display--compact .card-display__body {
  height: 4.6rem;
  padding: 0.4rem 0.5rem 0.45rem;
  gap: 0.18rem;
}

.card-display--compact .card-display__name {
  font-size: 0.78rem;
}

.card-display--compact .card-display__effect {
  font-size: 0.62rem;
}

.card-display--compact .card-display__cost {
  width: 1.75rem;
  height: 1.75rem;
  top: -0.35rem;
  right: -0.35rem;
}

.card-display--compact .card-display__cost-value {
  font-size: 0.85rem;
}

.card-display--compact .card-display__scale {
  top: 0.3rem;
  left: 0.25rem;
  font-size: 0.45rem;
  max-width: 4.2rem;
  padding: 0.14rem 0.4rem;
}

.card-display--compact .card-display__qty {
  left: 0.25rem;
}

.card-display--compact .card-display__upgrade {
  left: 1.7rem;
}

.card-display--compact.card-display--has-scale .card-display__qty,
.card-display--compact.card-display--has-scale .card-display__upgrade {
  top: 1.65rem;
}

.card-display--compact .card-display__footer {
  height: 1.35rem;
}

.card-display--compact .card-display__stat-value {
  font-size: 0.68rem;
}

@keyframes card-foil-sweep {
  from {
    background-position: 120% 40%;
  }
  to {
    background-position: -20% 60%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-display--foil:hover .card-display__foil,
  .card-display--selected .card-display__foil {
    animation: none;
  }
}
</style>
