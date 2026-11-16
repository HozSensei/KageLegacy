<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandMark from '../ui/BrandMark.vue'
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
  /**
   * Face contrôlée : `front` | `back`. Si null, l’état interne s’applique
   * (utile pour l’ouverture de booster).
   */
  face: { type: String, default: null, validator: (v) => v == null || v === 'front' || v === 'back' },
  /** Affiche un bouton pour retourner la carte (collection). */
  flippable: { type: Boolean, default: false },
  /** Inclinaison 3D au survol (désactivée si reduced-motion). */
  tilt: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'flip'])

const { t, te, locale } = useI18n()

const internalFlipped = ref(false)
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

watch(
  () => props.face,
  (next) => {
    if (next === 'back') internalFlipped.value = true
    else if (next === 'front') internalFlipped.value = false
  },
  { immediate: true },
)

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

const isFlipped = computed(() => {
  if (props.face === 'back') return true
  if (props.face === 'front') return false
  return internalFlipped.value
})

const serialLabel = computed(() => {
  if (props.catalogueNumber != null) {
    return t('cards.serialNumber', { n: String(props.catalogueNumber).padStart(3, '0') })
  }
  return t('cards.serialBrand')
})

function onSelect() {
  emit('select', props.card)
}

function toggleFlip(event) {
  event?.stopPropagation?.()
  if (props.face != null) return
  if (!props.flippable) return
  internalFlipped.value = !internalFlipped.value
  emit('flip', isFlipped.value ? 'back' : 'front')
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
        'card-display--has-scale': Boolean(scaleStat),
        'card-display--flipped': isFlipped,
        'card-display--flippable': flippable,
      },
    ]"
    :data-tone="typeVisual.tone"
    :data-rarity="rarityKey"
    :data-rarity-level="rarityLevel"
    :aria-pressed="selected"
    data-testid="card-display"
    :style="tiltStyle"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <div class="card-display__flipper">
      <!-- Face avant -->
      <button
        type="button"
        class="card-display__face card-display__face--front"
        data-testid="card-face-front"
        @click="onSelect"
      >
        <span class="card-display__inner-ring" aria-hidden="true" />

        <div class="card-display__shell">
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

          <div class="card-display__body">
            <div class="card-display__info">
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

            <div class="card-display__serial-row">
              <span
                v-if="catalogueNumber != null"
                class="card-display__catalogue-n"
                data-testid="card-catalogue-number"
                :title="t('cards.catalogueNumberLabel', { n: catalogueNumber })"
              >
                {{ serialLabel }}
              </span>
              <span v-else class="card-display__catalogue-n card-display__catalogue-n--brand">
                {{ serialLabel }}
              </span>
              <span
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
              </span>
            </div>
          </div>

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
          <span class="card-display__cost-gem" aria-hidden="true" />
          <span class="card-display__cost-value">{{ cost }}</span>
        </span>

        <!-- Catégorie scaling — ruban gauche -->
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

        <span class="card-display__sheen" aria-hidden="true" />
      </button>

      <!-- Face arrière -->
      <div
        class="card-display__face card-display__face--back"
        data-testid="card-face-back"
        aria-hidden="true"
      >
        <span class="card-display__back-pattern" />
        <div class="card-display__back-inner">
          <BrandMark class="card-display__back-logo" size="4.5rem" />
          <div class="card-display__back-title">{{ t('app.name') }}</div>
          <div class="card-display__back-sub">{{ t('cards.backSubtitle') }}</div>
        </div>
        <span class="card-display__sheen" aria-hidden="true" />
      </div>
    </div>

    <button
      v-if="flippable && face == null"
      type="button"
      class="card-display__flip-btn"
      data-testid="card-flip-btn"
      :aria-label="isFlipped ? t('cards.flipToFront') : t('cards.flipToBack')"
      :aria-pressed="isFlipped"
      @click="toggleFlip"
    >
      {{ isFlipped ? t('cards.flipFrontShort') : t('cards.flipBackShort') }}
    </button>
  </div>
</template>

<style scoped>
.card-display {
  /* Cadre rareté V5 — acier / saphir / améthyste / or */
  --edge: #aab3bc;
  --glint: #e6ebf0;
  --inner: #697580;
  --halo: transparent;
  --card-body-bg: linear-gradient(145deg, #f4e9d8, #e0d0b8);
  --card-body-fg: #27313b;
  --card-body-muted: #98775a;
  --card-footer-bg: #d5c3aa;
  --card-footer-line: #c4b198;
  --card-serial: #826c55;
  --card-border: 2px;

  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  aspect-ratio: 2.5 / 3.5;
  perspective: 1200px;
  filter: drop-shadow(0 14px 16px color-mix(in srgb, var(--color-ink) 28%, transparent));
  transition: transform var(--dur-fast) ease;
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
  border: var(--card-border) solid var(--edge);
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
  display: block;
}

.card-display__face--back {
  display: grid;
  place-items: center;
  transform: rotateY(180deg);
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 45%, #303d4a, #171c24 65%, #0e1319);
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

.card-display__inner-ring {
  position: absolute;
  z-index: 7;
  pointer-events: none;
  inset: 5px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--glint) 65%, transparent);
}

.card-display--rare .card-display__inner-ring,
.card-display--legendary .card-display__inner-ring,
.card-display--mythic .card-display__inner-ring {
  opacity: 0.9;
}

.card-display__shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 5px;
}

.card-display__art {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border-radius: 5px 5px 0 0;
  background: #4e6578;
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

.card-display__body {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--card-body-bg);
  color: var(--card-body-fg);
  padding: 0.7rem 0.75rem 0;
}

.card-display__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-height: 4.6rem;
}

.card-display__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
  font-stretch: 92%;
  line-height: 1;
  letter-spacing: 0.015em;
  text-transform: uppercase;
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
  margin: 0.35rem 0 0;
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--card-body-muted);
}

.card-display__meta-sep {
  opacity: 0.7;
}

.card-display__effect {
  margin: 0.45rem 0 0;
  padding-top: 0.45rem;
  border-top: 1px solid #bca78d;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--card-body-fg);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-display__serial-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  height: 1.55rem;
  margin: 0.45rem -0.75rem 0;
  padding: 0 0.7rem;
  border-top: 1px solid var(--card-footer-line);
  background: var(--card-footer-bg);
}

.card-display__catalogue-n {
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--card-serial);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-display__rarity {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.card-display__rarity-name {
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #655442;
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

.card-display__footer {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  flex: 0 0 auto;
  height: 1.55rem;
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
  font-size: 0.78rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 1px color-mix(in srgb, #000 45%, transparent);
}

/* Gemme de chakra — coin haut droit */
.card-display__cost {
  position: absolute;
  z-index: 12;
  top: -0.55rem;
  right: -0.55rem;
  display: grid;
  place-items: center;
  width: 3.15rem;
  height: 3.15rem;
  filter: drop-shadow(3px 6px 3px #070b13a9);
  pointer-events: none;
}

.card-display__cost-gem {
  position: absolute;
  inset: 0.48rem;
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

.card-display__cost-gem::after {
  content: '';
  position: absolute;
  inset: 5px;
  background: linear-gradient(145deg, #fff8, transparent 50%, #071f4b80);
  clip-path: polygon(0 0, 100% 0, 50% 50%, 100% 100%, 0 100%, 50% 50%);
}

.card-display__cost-value {
  position: relative;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 900;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fff;
  text-shadow:
    0 2px 4px #0d1a2a,
    0 0 8px #071d33;
}

/* Ruban scaling — gauche, style famille V5 */
.card-display__scale {
  position: absolute;
  z-index: 10;
  left: -0.45rem;
  top: 1rem;
  max-width: 6.5rem;
  padding: 0.4rem 0.85rem 0.4rem 0.7rem;
  clip-path: polygon(0 0, 100% 0, 93% 100%, 0 100%);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--tone-fill, var(--color-neutral-fill)) 88%, white),
    var(--tone-fill, var(--color-neutral-fill)) 47%,
    color-mix(in srgb, var(--tone-fill, var(--color-neutral-fill)) 70%, black)
  );
  border: 1px solid color-mix(in srgb, var(--color-on-ink) 55%, transparent);
  box-shadow:
    3px 4px 0 #141820,
    5px 7px 9px #0008;
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.1;
  color: #fff;
  text-shadow: 0 1px 2px #0008;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.card-display__qty,
.card-display__upgrade {
  position: absolute;
  z-index: 11;
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
  pointer-events: none;
}

.card-display__qty {
  top: 0.4rem;
  left: 0.45rem;
}

.card-display__upgrade {
  top: 0.4rem;
  left: 2.1rem;
  border: 1px solid color-mix(in srgb, var(--color-gold-fill) 70%, transparent);
}

.card-display--has-scale .card-display__qty,
.card-display--has-scale .card-display__upgrade {
  top: 3.1rem;
  left: 0.55rem;
}

.card-display--has-scale .card-display__upgrade {
  left: 2.2rem;
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
  margin: 0 auto;
  color: #f2e7d5;
  filter: drop-shadow(0 0 15px #caa56d65);
}

.card-display__back-title {
  margin-top: 1.1rem;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.2em;
}

.card-display__back-sub {
  margin-top: 0.4rem;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: #c7a77e;
}

.card-display__flip-btn {
  position: absolute;
  z-index: 20;
  right: 0.35rem;
  bottom: -0.85rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--color-line-strong);
  border-radius: 0.25rem;
  background: var(--color-bg-card);
  color: var(--color-ink);
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 4px 10px color-mix(in srgb, var(--color-ink) 18%, transparent);
}

.card-display__flip-btn:hover {
  background: var(--color-wood-fill);
  border-color: var(--color-gold-fill);
  color: var(--color-ink);
}

.card-display__face:focus-visible,
.card-display__flip-btn:focus-visible {
  outline: 3px solid var(--color-indigo);
  outline-offset: 3px;
}

.card-display--selected .card-display__face--front {
  outline: 3px solid var(--color-ink);
  outline-offset: 2px;
}

.card-display--compact .card-display__info {
  min-height: 3.7rem;
}

.card-display--compact .card-display__name {
  font-size: 0.82rem;
}

.card-display--compact .card-display__effect {
  font-size: 0.62rem;
}

.card-display--compact .card-display__cost {
  width: 2.45rem;
  height: 2.45rem;
  top: -0.4rem;
  right: -0.4rem;
}

.card-display--compact .card-display__cost-value {
  font-size: 0.95rem;
}

.card-display--compact .card-display__scale {
  top: 0.7rem;
  left: -0.35rem;
  font-size: 0.55rem;
  max-width: 4.8rem;
  padding: 0.28rem 0.55rem 0.28rem 0.45rem;
}

.card-display--compact .card-display__serial-row {
  height: 1.3rem;
  margin-top: 0.3rem;
}

.card-display--compact .card-display__rarity-name {
  display: none;
}

.card-display--compact .card-display__footer {
  height: 1.3rem;
}

.card-display--compact .card-display__stat-value {
  font-size: 0.66rem;
}

.card-display--compact .card-display__back-title {
  font-size: 0.85rem;
}

.card-display--compact .card-display__back-logo {
  width: 3.25rem !important;
  height: 3.25rem !important;
}

@media (prefers-reduced-motion: reduce) {
  .card-display,
  .card-display__flipper,
  .card-display__sheen {
    transition: none !important;
  }
}
</style>
