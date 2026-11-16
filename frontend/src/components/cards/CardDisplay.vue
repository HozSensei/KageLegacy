<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandMark from '../ui/BrandMark.vue'
import { resolveCardArt } from '../../utils/cardArt'
import { cardEffectParts } from '../../utils/cardEffectLine'
import { cardBonusChips, cardFamilyKey } from '../../utils/cardBonusChips'
import {
  cardTypeVisual,
  elementLabelKey,
  elementTone,
  rarityVisual,
} from '../../utils/cardVisuals'
import { localizedName } from '../../utils/localeContent.js'

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
  /**
   * Face contrôlée (booster uniquement) : `front` | `back`.
   * Si null → face avant seule, sans flip (collection / deck).
   */
  face: {
    type: String,
    default: null,
    validator: (v) => v == null || v === 'front' || v === 'back',
  },
  /** Inclinaison 3D au survol (collection). Désactivée si reduced-motion. */
  tilt: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const { t, te, locale } = useI18n()

const tiltStyle = ref(null)
const reduceMotion = ref(false)

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduceMotion.value = mq.matches
  const onChange = () => {
    reduceMotion.value = mq.matches
  }
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
  else if (typeof mq.addListener === 'function') mq.addListener(onChange)
}

const name = computed(() => localizedName(props.card, locale.value))

const rarityKey = computed(() => props.card.rarity || 'common')
const rarityClass = computed(() => `card-display--${rarityKey.value}`)
const rarity = computed(() => rarityVisual(props.card.rarity))
const rarityLevel = computed(() => rarity.value.pips || 1)

const typeLabel = computed(() => t(`cards.types.${props.card.type}`, props.card.type))
const typeVisual = computed(() => cardTypeVisual(props.card.type))

const elementLabel = computed(() => {
  const key = elementLabelKey(props.card.element)
  if (!key) return ''
  return te(key) ? t(key) : props.card.element
})

const effectParts = computed(() =>
  cardEffectParts(props.card, props.stats, { t, te, locale: locale.value }),
)

const familyKey = computed(() => cardFamilyKey(props.card))
const familyLabel = computed(() => {
  if (familyKey.value === 'heredite') {
    return te('cards.stats.medicine')
      ? t('cards.stats.medicine')
      : 'Hérédité'
  }
  return te(`cards.stats.${familyKey.value}`)
    ? t(`cards.stats.${familyKey.value}`)
    : familyKey.value
})

const bonusChips = computed(() => cardBonusChips(props.card))

const artUrl = computed(() => resolveCardArt(props.card))
const cost = computed(() => props.card.cost ?? props.card.baseCost ?? 0)

/** Flip structure only when booster controls `face`. */
const enableFlip = computed(() => props.face != null)

const isFlipped = computed(() => props.face === 'back')

const serialLabel = computed(() => {
  if (props.catalogueNumber != null) {
    return t('cards.serialNumber', { n: String(props.catalogueNumber).padStart(3, '0') })
  }
  return t('cards.serialBrand')
})

function onSelect() {
  emit('select', props.card)
}

function onPointerMove(event) {
  if (!props.tilt || reduceMotion.value || isFlipped.value) return
  if (event.pointerType === 'touch') return
  const el = event.currentTarget
  const r = el.getBoundingClientRect()
  const x = (event.clientX - r.left) / r.width - 0.5
  const y = (event.clientY - r.top) / r.height - 0.5
  tiltStyle.value = {
    transform: `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`,
  }
}

function onPointerLeave() {
  tiltStyle.value = null
}

watch(
  () => props.face,
  () => {
    tiltStyle.value = null
  },
)
</script>

<template>
  <div
    class="card-display"
    :class="[
      rarityClass,
      {
        'card-display--selected': selected,
        'card-display--compact': compact,
        'card-display--foil': rarity.foil,
        'card-display--no-art': !artUrl,
        'card-display--flipped': isFlipped,
        'card-display--flip': enableFlip,
      },
    ]"
    :data-tone="typeVisual.tone"
    :data-rarity="rarityKey"
    :data-rarity-level="rarityLevel"
    :data-family="familyKey"
    :aria-pressed="selected"
    data-testid="card-display"
    :style="tiltStyle"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <div class="card-display__flipper">
      <!-- Face avant — anatomie HTML V5 -->
      <button
        type="button"
        class="card-display__face card-display__face--front"
        data-testid="card-face-front"
        @click="onSelect"
      >
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

        <div
          class="card-display__category"
          :class="`card-display__category--${familyKey}`"
          data-testid="card-scale-hint"
          :title="familyLabel"
        >
          {{ familyLabel }}
        </div>

        <div class="card-display__chakra" :title="t('cards.costLabel')" data-testid="card-cost">
          <span class="card-display__chakra-gem" aria-hidden="true" />
          <span class="card-display__chakra-number">{{ cost }}</span>
        </div>

        <section
          class="card-display__info"
          :class="{ 'card-display__info--with-bonuses': bonusChips.length }"
          :data-bonus-count="bonusChips.length || undefined"
        >
          <div class="card-display__description">
            <h3 class="card-display__name">{{ name }}</h3>
            <p class="card-display__type">
              <span>{{ typeLabel }}</span>
              <template v-if="elementLabel">
                <span aria-hidden="true"> · </span>
                <span :data-tone="elementTone(card.element)">{{ elementLabel }}</span>
              </template>
            </p>
            <div class="card-display__rule" aria-hidden="true" />
            <p
              v-if="effectParts.texts.length"
              class="card-display__effect"
              :aria-label="effectParts.aria.join(', ')"
            >
              <template v-for="(text, i) in effectParts.texts" :key="i">
                <span v-if="i > 0"> · </span>
                <strong v-if="i < effectParts.figures.length">{{ text }}</strong>
                <template v-else>{{ text }}</template>
              </template>
            </p>
          </div>

          <div
            v-if="bonusChips.length"
            class="card-display__bonuses"
            :aria-label="t('cards.passiveBonus')"
          >
            <div
              v-for="chip in bonusChips"
              :key="chip.key"
              class="card-display__bonus"
              :style="{ '--light': chip.light, '--dark': chip.dark }"
              :title="`${t(`cards.stats.${chip.key}`, chip.key)} ${chip.value > 0 ? '+' : ''}${chip.value}`"
            >
              <i aria-hidden="true" />
              <span>{{ chip.value > 0 ? `+${chip.value}` : chip.value }}</span>
            </div>
          </div>

          <footer class="card-display__footer">
            <span
              class="card-display__serial"
              data-testid="card-catalogue-number"
              :title="
                catalogueNumber != null
                  ? t('cards.catalogueNumberLabel', { n: catalogueNumber })
                  : undefined
              "
            >
              {{ serialLabel }}
            </span>
            <div
              class="card-display__rarity"
              :aria-label="t(`cards.rarities.${rarityKey}`)"
            >
              <span class="card-display__rarity-name">{{ t(`cards.rarities.${rarityKey}`) }}</span>
              <span class="card-display__rarity-pips" aria-hidden="true">
                <i
                  v-for="n in rarityLevel"
                  :key="n"
                  class="card-display__diamond"
                />
              </span>
            </div>
          </footer>
        </section>

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

        <span class="card-display__sheen" aria-hidden="true" />
      </button>

      <!-- Face arrière — booster uniquement -->
      <div
        v-if="enableFlip"
        class="card-display__face card-display__face--back"
        data-testid="card-face-back"
        aria-hidden="true"
      >
        <span class="card-display__back-pattern" />
        <div class="card-display__back-inner">
          <BrandMark class="card-display__back-logo" size="7.875rem" />
          <div class="card-display__back-title">{{ t('app.name') }}</div>
          <div class="card-display__back-sub">{{ t('cards.backSubtitle') }}</div>
        </div>
        <span class="card-display__sheen" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Anatomie fidèle à carte-ninja-v5-raretes HTML :
 * art fixe → ruban famille → gemme chakra → info (description | bonuses) → footer.
 */
.card-display {
  --edge: #aab3bc;
  --glint: #e6ebf0;
  --inner: #697580;
  --halo: transparent;
  --card-footer-bg: #d5c3aa;
  --card-footer-line: #c4b198;

  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  aspect-ratio: 296 / 444;
  perspective: 1200px;
  transform-style: preserve-3d;
  container-type: inline-size;
  filter: drop-shadow(0 24px 22px #0009);
  transition: transform 0.14s ease;
}

.card-display--common {
  --edge: #8995a2;
  --glint: #d5dce2;
  --inner: #53616f;
  --halo: #8a9ba622;
}

.card-display--rare {
  --edge: #459edc;
  --glint: #bcecff;
  --inner: #1b5686;
  --halo: #329fe15c;
  --card-footer-bg: linear-gradient(100deg, #c5d6e0, #e0e8e9, #b3cfdd);
  --card-footer-line: #8eafc5;
}

.card-display--legendary {
  --edge: #a86ce8;
  --glint: #efd0ff;
  --inner: #60329b;
  --halo: #b56aff72;
  --card-footer-bg: linear-gradient(100deg, #d7c4e1, #ead9ee, #cbb3dd);
  --card-footer-line: #ae8ac1;
}

.card-display--mythic {
  --edge: #e2ac45;
  --glint: #fff0b5;
  --inner: #94601e;
  --halo: #ffc34d90;
  --card-footer-bg: linear-gradient(100deg, #ead4a7, #f8e9c7, #d4ae6a);
  --card-footer-line: #c69b4f;
}

.card-display__flipper {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.card-display--flip .card-display__flipper {
  transition: transform 0.7s cubic-bezier(0.2, 0.75, 0.2, 1);
}

.card-display--flipped .card-display__flipper {
  transform: rotateY(180deg);
}

.card-display__face {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  border: 2px solid var(--edge);
  border-radius: 7px;
  background: #202935;
  color: inherit;
  box-shadow:
    inset 0 0 0 2px #111b25,
    inset 0 0 0 5px var(--inner),
    0 0 0 1px var(--glint),
    0 0 17px var(--halo);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: visible;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.card-display__face--front {
  display: flex;
  flex-direction: column;
}

.card-display__face--front::before {
  content: '';
  position: absolute;
  z-index: 7;
  pointer-events: none;
  inset: 5px;
  border-radius: 3px;
  border: 1px solid var(--glint);
  opacity: 0.65;
}

.card-display--rare .card-display__face--front::before,
.card-display--legendary .card-display__face--front::before,
.card-display--mythic .card-display__face--front::before {
  opacity: 0.9;
}

.card-display--mythic .card-display__face--front {
  background: #30271b;
}

/* Dos neutre — même bordure pour toutes les raretés (pas de spoil). */
.card-display__face--back {
  display: grid;
  place-items: center;
  transform: rotateY(180deg);
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 45%, #303d4a, #171c24 65%, #0e1319);
  border-color: #aab3bc;
  box-shadow:
    inset 0 0 0 2px #111b25,
    inset 0 0 0 5px #a17c57,
    0 0 0 1px #e6ebf066;
  pointer-events: none;
}

.card-display__face--back::before,
.card-display__face--back::after {
  content: '';
  position: absolute;
  inset: 12px;
  border: 1px solid #bc9b70a8;
  border-radius: 2px;
  pointer-events: none;
}

.card-display__face--back::after {
  inset: 19px;
  border-color: #a3acb433;
}

/* Art — un peu moins haut que le proto HTML pour laisser plus
 * de place au parchemin (titre / effet). Les bonus à 3+ chips
 * remontent par-dessus l’illustration plutôt que le footer. */
.card-display__art {
  height: 52%;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 5px 5px 0 0;
  background: #4e6578;
}

@container (max-width: 11.5rem) {
  .card-display__art {
    height: 44%;
  }

  .card-display__info {
    --card-info-pad-x: 10px;
    --card-footer-h: 26px;
    --card-footer-gap: 6px;
    --bonus-col: 2.65rem;
    padding: 9px var(--card-info-pad-x) 0;
  }

  .card-display__rule {
    margin: 6px 0 5px;
  }

  .card-display__name {
    font-size: clamp(0.68rem, 6.8cqi, 1.05rem);
  }

  .card-display__effect {
    font-size: clamp(0.55rem, 3.4cqi, 0.66rem);
    -webkit-line-clamp: 5;
  }

  .card-display__bonus {
    width: 34px;
    height: 27px;
    font-size: 13px;
    gap: 3px;
  }

  .card-display__bonus i {
    width: 5px;
    height: 5px;
  }

  .card-display__footer {
    height: var(--card-footer-h);
    margin: var(--card-footer-gap) calc(var(--card-info-pad-x) * -1) 0;
  }
}

.card-display__art::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(0deg, #18212c 0%, transparent 18%),
    linear-gradient(90deg, #111a2633, transparent 24%, transparent 75%, #111a2633);
}

.card-display--mythic .card-display__art::after {
  background:
    linear-gradient(0deg, #2e2418 0%, transparent 18%),
    linear-gradient(90deg, #d5a75320, transparent 24%, transparent 75%, #d5a75320);
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
  object-position: center 26%;
  user-select: none;
}

.card-display__art-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 2.75rem;
  color: var(--tone-fill, var(--color-neutral-fill));
  opacity: 0.45;
}

/* Ruban famille — clip-path polygon prototype */
.card-display__category {
  position: absolute;
  z-index: 10;
  left: -9px;
  top: 18px;
  max-width: calc(100% - 4.5rem);
  padding: 8px 18px 8px 16px;
  clip-path: polygon(0 0, 100% 0, 93% 100%, 0 100%);
  background: linear-gradient(#ff9673 0%, #d8513d 47%, #8c302c 100%);
  border: 1px solid #f5c5a4;
  box-shadow:
    3px 4px 0 #141820,
    5px 7px 9px #0008;
  color: #fff;
  font-family: var(--font-display);
  font-size: clamp(0.65rem, 4.7cqi, 0.875rem);
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.1;
  text-shadow: 0 1px 2px #0008;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.card-display__category--ninjutsu {
  background: linear-gradient(#8bc4e8, #3776af, #214b81);
  border-color: #b8d9f0;
}

.card-display__category--genjutsu {
  background: linear-gradient(#d6a4f1, #8653b4, #523274);
  border-color: #e2c4f5;
}

.card-display__category--heredite {
  background: linear-gradient(#8acfae, #408b68, #255d49);
  border-color: #b8e0cb;
}

/* Gemme chakra — coin haut droit débordant */
.card-display__chakra {
  position: absolute;
  z-index: 12;
  right: -12px;
  top: -13px;
  width: clamp(2.6rem, 24.7%, 4.5625rem);
  aspect-ratio: 1;
  filter: drop-shadow(3px 6px 3px #070b13a9);
  pointer-events: none;
}

.card-display__chakra-gem {
  position: absolute;
  inset: 15%;
  transform: rotate(45deg);
  background: linear-gradient(
    135deg,
    #fff3d6 0%,
    #b9d4e8 24%,
    #3d648b 50%,
    #162d4d 56%,
    #a7d3ee 81%,
    #fff0c3 100%
  );
  border: 2px solid #f7dbab;
  box-shadow:
    inset 0 0 0 3px #1b314b,
    inset 0 0 12px #f4fcff;
}

.card-display__chakra-gem::after {
  content: '';
  position: absolute;
  inset: 5px;
  background: linear-gradient(145deg, #fff8, transparent 50%, #071f4b80);
  clip-path: polygon(0 0, 100% 0, 50% 50%, 100% 100%, 0 100%, 50% 50%);
}

.card-display__chakra-number {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: clamp(1rem, 10cqi, 1.875rem);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fff;
  text-shadow:
    0 2px 4px #0d1a2a,
    0 0 8px #071d33;
}

/* Bloc info — fond parchemin.
 * Les bonus sont ancrés en bas (au-dessus du footer) et peuvent
 * déborder vers le haut sur l’illustration si 3 chips. */
.card-display__info {
  --card-info-pad-x: 12px;
  --card-footer-h: 29px;
  --card-footer-gap: 8px;
  --bonus-col: 3rem;

  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  container-type: inline-size;
  background: linear-gradient(145deg, #f4e9d8, #e0d0b8);
  color: #27313b;
  padding: 10px var(--card-info-pad-x) 0;
}

.card-display__description {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.card-display__info--with-bonuses .card-display__description {
  padding-right: calc(var(--bonus-col) + 0.35rem);
}

.card-display__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(0.78rem, 7.4cqi, 1.35rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: #27313b;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-display__type {
  margin: 5px 0 0;
  font-size: clamp(0.48rem, 2.8cqi, 0.55rem);
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #98775a;
}

.card-display__rule {
  height: 1px;
  background: #bca78d;
  margin: 7px 0 6px;
}

.card-display__effect {
  margin: 0;
  font-size: clamp(0.58rem, 3.6cqi, 0.7rem);
  line-height: 1.35;
  font-weight: 600;
  color: #27313b;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-display__effect strong {
  font-weight: 900;
}

/* Bonus hex — ancrés bas (au-dessus du footer), stack vers le haut.
 * Avec 3 chips la colonne déborde volontairement sur l’art. */
.card-display__bonuses {
  position: absolute;
  z-index: 6;
  right: 0.35rem;
  bottom: calc(var(--card-footer-h) + var(--card-footer-gap) + 2px);
  width: var(--bonus-col);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  padding: 0 0 2px;
  border: 0;
  pointer-events: none;
}

.card-display__bonus {
  width: 40px;
  height: 32px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 1px 2px #0008;
  filter: drop-shadow(1px 2px 1px #0004);
  pointer-events: auto;
  flex-shrink: 0;
}

.card-display__info[data-bonus-count='3'] .card-display__bonuses {
  gap: 5px;
  /* Remonte la colonne pour chevaucher l’illustration, pas le footer */
  margin-bottom: 0;
  padding-bottom: 0;
}

.card-display__info[data-bonus-count='3'] .card-display__bonus {
  width: 38px;
  height: 31px;
  font-size: 15px;
  gap: 3px;
}

.card-display__info[data-bonus-count='3'] .card-display__bonus i {
  width: 5px;
  height: 5px;
}

.card-display__bonus::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border: 1px solid #fff7;
  clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
  background: linear-gradient(160deg, var(--light), var(--dark));
}

.card-display__bonus i {
  position: relative;
  width: 7px;
  height: 7px;
  transform: rotate(45deg);
  background: #fff9;
}

.card-display__bonus span {
  position: relative;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Footer serial + rareté */
.card-display__footer {
  position: relative;
  z-index: 7;
  height: var(--card-footer-h);
  margin: var(--card-footer-gap) calc(var(--card-info-pad-x) * -1) 0;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  border-top: 1px solid var(--card-footer-line);
  background: var(--card-footer-bg);
  border-radius: 0 0 5px 5px;
  flex-shrink: 0;
}

.card-display__serial {
  font-size: 9px;
  font-weight: 800;
  color: #826c55;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-display__rarity {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.card-display__rarity-name {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #655442;
  margin-right: 7px;
}

.card-display__rarity-pips {
  display: flex;
  gap: 4px;
  align-items: center;
}

.card-display__diamond {
  display: block;
  width: 10px;
  height: 10px;
  transform: rotate(45deg);
  border: 1.5px solid #876d4f;
  background: linear-gradient(135deg, #fff1c3, #b18a56);
  box-shadow:
    inset 0 0 0 1px #ffffff6e,
    1px 1px 1px #0003;
}

.card-display--common .card-display__diamond {
  background: linear-gradient(135deg, #eee, #788594);
  border-color: #697483;
}

.card-display--rare .card-display__diamond {
  background: linear-gradient(135deg, #dff5ff, #4296c5);
  border-color: #40769d;
}

.card-display--legendary .card-display__diamond {
  background: linear-gradient(135deg, #f9dfff, #9954d9);
  border-color: #8744c3;
  box-shadow: 0 0 5px #bb7fff88;
}

.card-display--mythic .card-display__diamond {
  background: linear-gradient(135deg, #fff5c4, #d89b30);
  border-color: #ad7c2b;
  box-shadow: 0 0 7px #ffc44baa;
}

.card-display__qty,
.card-display__upgrade {
  position: absolute;
  z-index: 11;
  top: 3.25rem;
  display: inline-grid;
  place-items: center;
  min-width: 1.45rem;
  height: 1.25rem;
  padding: 0 0.28rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--color-ink, #111) 78%, transparent);
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-on-ink, #fff);
  pointer-events: none;
}

.card-display__qty {
  left: 0.55rem;
}

.card-display__upgrade {
  left: 2.2rem;
  border: 1px solid color-mix(in srgb, var(--color-gold-fill, #d4a84b) 70%, transparent);
}

.card-display__sheen {
  position: absolute;
  z-index: 15;
  inset: 0;
  pointer-events: none;
  border-radius: 7px;
  overflow: hidden;
  background: linear-gradient(110deg, transparent 28%, #fff2 45%, transparent 59%);
  opacity: 0;
  transition: opacity 0.2s;
}

.card-display:hover .card-display__sheen {
  opacity: 1;
}

.card-display--rare .card-display__sheen {
  background: linear-gradient(112deg, transparent 15%, #a8e5ff19 37%, #d6f5ff4d 47%, transparent 60%);
  opacity: 0.7;
}

.card-display--legendary .card-display__sheen {
  background: linear-gradient(
    112deg,
    transparent 15%,
    #b76dff25 32%,
    #ffb8f55e 48%,
    #8ad9ff27 57%,
    transparent 70%
  );
  opacity: 0.9;
}

.card-display--mythic .card-display__sheen {
  background: linear-gradient(
    112deg,
    transparent 14%,
    #fff0a433 31%,
    #fff9d58c 46%,
    #e2b4ff38 56%,
    transparent 70%
  );
  opacity: 1;
}

.card-display__back-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  background: repeating-linear-gradient(
    45deg,
    transparent 0 19px,
    #c7a77e 20px,
    transparent 21px 40px
  );
}

.card-display__back-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #f2e7d5;
}

.card-display__back-logo {
  display: block;
  margin: 0 auto;
  color: #f2e7d5;
  filter: drop-shadow(0 0 15px #caa56d65);
}

.card-display__back-title {
  margin-top: 22px;
  font-family: var(--font-display);
  font-size: clamp(0.9rem, 9.5cqi, 1.75rem);
  font-weight: 900;
  letter-spacing: 0.2em;
}

.card-display__back-sub {
  margin-top: 7px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: #c7a77e;
}

.card-display__face:focus-visible {
  outline: 3px solid var(--color-indigo, #5b6cff);
  outline-offset: 3px;
}

.card-display--selected .card-display__face--front {
  outline: 3px solid var(--color-ink, #111);
  outline-offset: 2px;
}

/* Compact (deck / booster stack) — même anatomie, typo réduite */
.card-display--compact {
  container-type: inline-size;
}

.card-display--compact .card-display__info {
  --card-info-pad-x: 10px;
  --card-footer-h: 24px;
  --card-footer-gap: 6px;
  --bonus-col: 2.5rem;
  padding: 8px var(--card-info-pad-x) 0;
}

.card-display--compact .card-display__name {
  font-size: clamp(0.66rem, 6.5cqi, 1rem);
}

.card-display--compact .card-display__type {
  margin-top: 3px;
  font-size: 0.48rem;
}

.card-display--compact .card-display__rule {
  margin: 5px 0 4px;
}

.card-display--compact .card-display__effect {
  font-size: 0.56rem;
  -webkit-line-clamp: 4;
}

.card-display--compact .card-display__bonuses {
  gap: 4px;
  right: 0.3rem;
}

.card-display--compact .card-display__bonus {
  width: 30px;
  height: 24px;
  font-size: 12px;
  gap: 2px;
}

.card-display--compact .card-display__bonus i {
  width: 4px;
  height: 4px;
}

.card-display--compact .card-display__info[data-bonus-count='3'] .card-display__bonus {
  width: 28px;
  height: 22px;
  font-size: 11px;
}

.card-display--compact .card-display__footer {
  padding: 0 10px;
}

.card-display--compact .card-display__rarity-name {
  display: none;
}

.card-display--compact .card-display__category {
  left: -6px;
  top: 12px;
  padding: 5px 12px 5px 10px;
  font-size: clamp(0.5rem, 4cqi, 0.7rem);
}

.card-display--compact .card-display__chakra {
  right: -8px;
  top: -9px;
}

.card-display--compact .card-display__back-logo {
  width: 4.5rem !important;
  height: 4.5rem !important;
}

.card-display--compact .card-display__back-title {
  margin-top: 12px;
  font-size: 0.85rem;
}

@media (prefers-reduced-motion: reduce) {
  .card-display,
  .card-display--flip .card-display__flipper,
  .card-display__sheen {
    transition: none !important;
  }
}
</style>
