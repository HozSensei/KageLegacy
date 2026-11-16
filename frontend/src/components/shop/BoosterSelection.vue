<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ShopBalances from './ShopBalances.vue'
import BrandMark from '../ui/BrandMark.vue'
import { elementTone, rarityVisual } from '../../utils/cardVisuals'
import { CARD_ART_BY_SLUG } from '../../utils/cardArt'

defineOptions({ name: 'BoosterSelection' })

const props = defineProps({
  boosters: { type: Array, default: () => [] },
  balances: { type: Object, default: () => ({}) },
  elements: { type: Array, default: () => [] },
  selectedElement: { type: String, default: null },
  opening: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'select-element'])

const { t, locale } = useI18n()

/** Art d’aperçu distincte par type de parchemin (et par élément sélectionné). */
const ELEMENTAL_PREVIEW_SLUGS = {
  katon: 'colonne-de-feu',
  suiton: 'torrent-percant',
  raiton: 'chaine-d-eclairs',
  doton: 'bastion-tellurique',
  futon: 'tranche-ventee',
}

const BOOSTER_PREVIEW_SLUGS = {
  standard: 'poing-rapide',
  elemental: 'harmonie-des-cinq-vents',
  premium: 'aegis-ancestral',
}

function nameOf(booster) {
  return locale.value === 'en' ? booster.nameEn : booster.nameFr
}

function descOf(booster) {
  return locale.value === 'en' ? booster.descriptionEn : booster.descriptionFr
}

function costLabel(booster) {
  const parts = []
  if (booster.cost?.ryos) parts.push(t('shop.costRyos', { n: booster.cost.ryos }))
  if (booster.cost?.kageCoins) parts.push(t('shop.costCoins', { n: booster.cost.kageCoins }))
  return parts.join(' · ') || t('shop.costFree')
}

function canAfford(booster) {
  const ryos = props.balances.ryos || 0
  const coins = props.balances.kageCoins || 0
  return ryos >= (booster.cost?.ryos || 0) && coins >= (booster.cost?.kageCoins || 0)
}

function pct(prob) {
  return `${Math.round((prob || 0) * 1000) / 10}%`
}

function previewArt(booster) {
  let slug = BOOSTER_PREVIEW_SLUGS[booster.type] || BOOSTER_PREVIEW_SLUGS.standard
  if (booster.elementalOnly && props.selectedElement) {
    slug = ELEMENTAL_PREVIEW_SLUGS[props.selectedElement] || slug
  }
  return CARD_ART_BY_SLUG[slug] || null
}

const rarityOrder = ['common', 'rare', 'legendary', 'mythic']

const BOOSTER_VISUALS = {
  standard: { tone: 'indigo', accent: 'var(--color-indigo)' },
  elemental: { tone: 'sky', accent: 'var(--color-sky)' },
  premium: { tone: 'gold', accent: 'var(--color-gold)' },
}

function boosterVisual(booster) {
  const visual = BOOSTER_VISUALS[booster.type] || BOOSTER_VISUALS.standard
  if (booster.elementalOnly && props.selectedElement) {
    return { ...visual, tone: elementTone(props.selectedElement) }
  }
  return visual
}

const elementalBooster = computed(() => props.boosters.find((b) => b.elementalOnly))
</script>

<template>
  <div class="booster-selection" data-testid="booster-selection">
    <ShopBalances :balances="balances" />

    <div v-if="elementalBooster" class="booster-selection__elements">
      <p class="t-kicker">{{ t('shop.elementFilter') }}</p>
      <div class="chip-row">
        <button
          type="button"
          class="chip"
          :aria-pressed="!selectedElement"
          @click="emit('select-element', null)"
        >
          {{ t('shop.elementAny') }}
        </button>
        <button
          v-for="el in elements"
          :key="el"
          type="button"
          class="chip"
          :aria-pressed="selectedElement === el"
          :data-tone="elementTone(el)"
          @click="emit('select-element', el)"
        >
          <span class="dot chip__mark" aria-hidden="true" />
          {{ t(`shop.elements.${el}`, el) }}
        </button>
      </div>
    </div>

    <ul class="booster-pack-grid stagger">
      <li
        v-for="booster in boosters"
        :key="booster.type"
        class="booster-pack"
        :class="`booster-pack--${booster.type}`"
        :data-tone="boosterVisual(booster).tone"
        :data-testid="`booster-${booster.type}`"
      >
        <article class="booster-pack__shell" :aria-labelledby="`booster-title-${booster.type}`">
          <span class="booster-pack__crimp booster-pack__crimp--top" aria-hidden="true" />
          <div class="booster-pack__body">
            <header class="booster-pack__brand">
              <BrandMark size="0.95rem" class="booster-pack__mark" />
              <span>{{ t('app.name') }}</span>
              <span class="booster-pack__badge">{{ t('shop.packBadge') }}</span>
            </header>

            <p class="booster-pack__kicker">{{ t(`shop.types.${booster.type}`, booster.type) }}</p>
            <h3 :id="`booster-title-${booster.type}`" class="booster-pack__name">
              {{ nameOf(booster) }}
            </h3>

            <div class="booster-pack__art" aria-hidden="true">
              <img
                v-if="previewArt(booster)"
                class="booster-pack__art-img"
                :src="previewArt(booster)"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span class="booster-pack__art-glow" />
              <span class="booster-pack__art-seal">
                <BrandMark size="1.65rem" />
              </span>
              <span class="booster-pack__set">{{ t(`shop.types.${booster.type}`, booster.type) }}</span>
            </div>

            <p class="booster-pack__count">
              {{ t('shop.boosterPackCount', { n: booster.cardCount }) }}
            </p>
            <p class="booster-pack__desc">{{ descOf(booster) }}</p>
            <p v-if="booster.guaranteedMinRarity" class="booster-pack__guarantee">
              {{ t('shop.guaranteed', { rarity: t(`cards.rarities.${booster.guaranteedMinRarity}`) }) }}
            </p>
          </div>
          <span class="booster-pack__crimp booster-pack__crimp--bottom" aria-hidden="true" />
        </article>

        <div class="booster-pack__odds">
          <p class="t-kicker">{{ t('shop.oddsTitle') }}</p>
          <ul>
            <li v-for="rarity in rarityOrder" :key="rarity" :data-tone="rarityVisual(rarity).tone">
              <span class="booster-pack__odds-label">{{ t(`cards.rarities.${rarity}`) }}</span>
              <span class="booster-pack__odds-bar" aria-hidden="true">
                <span :style="{ width: pct(booster.probabilities?.[rarity]) }" />
              </span>
              <span class="booster-pack__odds-value">{{ pct(booster.probabilities?.[rarity]) }}</span>
            </li>
          </ul>
        </div>

        <p class="booster-pack__cost">{{ costLabel(booster) }}</p>

        <button
          type="button"
          class="btn-primary btn-block"
          :disabled="disabled || opening || !canAfford(booster)"
          data-testid="booster-open-btn"
          @click="emit('open', booster.type)"
        >
          {{
            opening
              ? t('shop.opening')
              : canAfford(booster)
                ? t('shop.open')
                : t('shop.insufficientFunds')
          }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.booster-selection__elements {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-bottom: 1.5rem;
}

.booster-pack-grid {
  display: grid;
  gap: 1.75rem;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 720px) {
  .booster-pack-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .booster-pack-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.booster-pack {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  align-items: stretch;
}

.booster-pack__shell {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(100%, 16.5rem);
  margin-inline: auto;
  border-radius: 0.55rem 0.55rem 0.45rem 0.45rem;
  background:
    linear-gradient(
      118deg,
      color-mix(in srgb, var(--color-on-ink) 18%, transparent) 0%,
      transparent 28%,
      transparent 62%,
      color-mix(in srgb, var(--color-ink) 22%, transparent) 100%
    ),
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--tone-fill) 88%, white) 0%,
      var(--tone-fill) 42%,
      color-mix(in srgb, var(--tone-fill) 70%, var(--color-ink)) 100%
    );
  color: var(--tone-on, var(--color-on-ink));
  box-shadow:
    0 18px 34px color-mix(in srgb, var(--color-ink) 28%, transparent),
    6px 10px 0 -2px color-mix(in srgb, var(--color-ink) 18%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--color-on-ink) 28%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--color-ink) 35%, transparent);
  transform: perspective(900px) rotateY(-6deg) rotateX(3deg);
  transition: transform var(--dur-base) var(--ease-out-quint);
}

.booster-pack__shell::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0.95rem 0.15rem;
  border-radius: 0.2rem;
  background:
    linear-gradient(
      105deg,
      transparent 20%,
      color-mix(in srgb, var(--color-on-ink) 16%, transparent) 42%,
      transparent 58%
    );
  mix-blend-mode: soft-light;
  opacity: 0.7;
}

.booster-pack:hover .booster-pack__shell {
  transform: perspective(900px) rotateY(-1deg) rotateX(1deg) translateY(-5px);
}

.booster-pack--standard .booster-pack__shell {
  background:
    linear-gradient(
      118deg,
      color-mix(in srgb, var(--color-on-ink) 16%, transparent) 0%,
      transparent 30%,
      transparent 60%,
      color-mix(in srgb, var(--color-ink) 20%, transparent) 100%
    ),
    linear-gradient(165deg, #465889 0%, #2a3558 45%, #151c30 100%);
}

.booster-pack--elemental .booster-pack__shell {
  background:
    linear-gradient(
      118deg,
      color-mix(in srgb, var(--color-on-ink) 16%, transparent) 0%,
      transparent 30%,
      transparent 60%,
      color-mix(in srgb, var(--color-ink) 20%, transparent) 100%
    ),
    linear-gradient(165deg, #3f8596 0%, #2a5a68 45%, #15343c 100%);
}

.booster-pack--premium .booster-pack__shell {
  background:
    linear-gradient(
      118deg,
      color-mix(in srgb, var(--color-gold-fill) 28%, transparent) 0%,
      transparent 32%,
      transparent 58%,
      color-mix(in srgb, var(--color-ink) 22%, transparent) 100%
    ),
    linear-gradient(165deg, #9a7834 0%, #6a4e1c 42%, #32240e 100%);
}

.booster-pack__crimp {
  height: 1.05rem;
  flex-shrink: 0;
  background:
    repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-ink) 55%, transparent) 0 2px,
      color-mix(in srgb, var(--color-on-ink) 28%, transparent) 2px 4px,
      color-mix(in srgb, var(--color-ink) 40%, transparent) 4px 7px,
      color-mix(in srgb, var(--color-on-ink) 12%, transparent) 7px 9px
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-ink) 70%, transparent),
      color-mix(in srgb, var(--color-ink) 45%, transparent)
    );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-on-ink) 22%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--color-ink) 45%, transparent);
}

.booster-pack__crimp--top {
  border-radius: 0.55rem 0.55rem 0 0;
}

.booster-pack__crimp--bottom {
  border-radius: 0 0 0.45rem 0.45rem;
}

.booster-pack__body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.55rem 0.7rem 0.65rem;
}

.booster-pack__brand {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.85;
}

.booster-pack__badge {
  margin-left: auto;
  padding: 0.1rem 0.3rem;
  border: 1px solid color-mix(in srgb, var(--color-on-ink) 45%, transparent);
  border-radius: 0.15rem;
  font-size: 0.5rem;
}

.booster-pack__kicker {
  margin: 0.15rem 0 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.8;
}

.booster-pack__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 800;
  font-stretch: 84%;
  line-height: 1.05;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.booster-pack__art {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 4;
  margin: 0.45rem 0 0.35rem;
  overflow: hidden;
  border: 3px solid color-mix(in srgb, var(--color-ink) 55%, transparent);
  border-radius: 0.2rem;
  background:
    radial-gradient(circle at 30% 22%, color-mix(in srgb, var(--color-gold-fill) 28%, transparent), transparent 52%),
    radial-gradient(circle at 70% 70%, color-mix(in srgb, var(--color-on-ink) 14%, transparent), transparent 45%),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-on-ink) 14%, transparent),
      color-mix(in srgb, var(--color-ink) 42%, transparent)
    );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-on-ink) 25%, transparent),
    inset 0 0 24px color-mix(in srgb, var(--color-ink) 35%, transparent);
}

.booster-pack__art-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
  filter: saturate(1.05) contrast(1.04);
}

.booster-pack__art-img::after {
  content: none;
}

.booster-pack__art::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, transparent 35%, color-mix(in srgb, var(--color-ink) 72%, transparent) 100%),
    linear-gradient(90deg, color-mix(in srgb, var(--color-ink) 28%, transparent), transparent 22%, transparent 78%, color-mix(in srgb, var(--color-ink) 28%, transparent));
}

.booster-pack--standard .booster-pack__art-img {
  object-position: center 22%;
}

.booster-pack--elemental .booster-pack__art-img {
  object-position: center 30%;
}

.booster-pack--premium .booster-pack__art-img {
  object-position: center 18%;
  filter: saturate(1.12) contrast(1.06) brightness(1.02);
}

.booster-pack__art-glow {
  position: absolute;
  inset: 12% 18% 28%;
  z-index: 1;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-gold-fill) 22%, transparent);
  filter: blur(12px);
  opacity: 0.55;
  pointer-events: none;
}

.booster-pack__art-seal {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 3.1rem;
  height: 3.1rem;
  margin-top: -2.5rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-ink) 55%, transparent);
  color: var(--color-on-ink);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-gold-fill) 55%, transparent);
}

.booster-pack__set {
  position: absolute;
  bottom: 0.55rem;
  left: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
  font-stretch: 80%;
  letter-spacing: 0.06em;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 2px 8px color-mix(in srgb, var(--color-ink) 65%, transparent);
}

.booster-pack__count {
  margin: 0;
  padding: 0.35rem 0.45rem;
  background: color-mix(in srgb, var(--color-ink) 55%, transparent);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
}

.booster-pack__desc {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.88;
}

.booster-pack__guarantee {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-gold-fill);
}

.booster-pack__odds {
  padding: 0.75rem 0 0.25rem;
  border-top: 1px solid var(--color-line);
}

.booster-pack__odds ul {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.booster-pack__odds li {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) 3.25rem;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8125rem;
}

.booster-pack__odds-label {
  font-weight: 500;
  color: var(--color-ink-muted);
}

.booster-pack__odds-bar {
  display: block;
  height: 0.375rem;
  background: var(--color-bg-soft);
}

.booster-pack__odds-bar > span {
  display: block;
  min-width: 2px;
  height: 100%;
  background: var(--tone-fill);
  transform-origin: left;
  animation: bar-grow 600ms var(--ease-out-quint) 200ms backwards;
}

.booster-pack__odds li[data-tone='neutral'] .booster-pack__odds-bar > span {
  background: var(--color-ink-faint);
}

.booster-pack__odds-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--color-ink);
}

.booster-pack__cost {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-ink);
}

@media (prefers-reduced-motion: reduce) {
  .booster-pack__shell,
  .booster-pack:hover .booster-pack__shell {
    transform: none;
  }
}
</style>
