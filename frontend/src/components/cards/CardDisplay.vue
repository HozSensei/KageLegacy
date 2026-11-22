<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BrandMark from '../ui/BrandMark.vue';
import { resolveCardArt } from '../../utils/cardArt';
import { cardEffectParts } from '../../utils/cardEffectLine';
import { cardBonusChips, cardFamilyKey, cardSecondaryArt } from '../../utils/cardBonusChips';
import {
  cardTypeVisual,
  elementLabelKey,
  elementTone,
  rarityVisual,
} from '../../utils/cardVisuals';
import { localizedName } from '../../utils/localeContent.js';

defineOptions({ name: 'CardDisplay' });

const props = defineProps({
  card: { type: Object, required: true },
  quantity: { type: Number, default: null },
  upgradeLevel: { type: Number, default: 0 },
  /** Numéro catalogue 1-based (#1…) — affiché en collection. */
  catalogueNumber: { type: Number, default: null },
  selected: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  /**
   * Emprise visuelle desktop (collection / deck).
   * `large` relève les plafonds de typo pour améliorer la lisibilité.
   */
  size: {
    type: String,
    default: 'normal',
    validator: v => v === 'normal' || v === 'large',
  },
  /** Stats du ninja : si fournies, les figures affichent la valeur effective. */
  stats: { type: Object, default: null },
  /**
   * Face contrôlée (booster uniquement) : `front` | `back`.
   * Si null → face avant seule, sans flip (collection / deck).
   */
  face: {
    type: String,
    default: null,
    validator: v => v == null || v === 'front' || v === 'back',
  },
  /** Inclinaison 3D au survol (collection). Désactivée si reduced-motion. */
  tilt: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  pressed: { type: Boolean, default: null },
  keyshortcuts: { type: String, default: null },
  description: { type: String, default: null },
  /** Art de la carte précédente du tour — active le highlight d’enchaînement. */
  previousCardStatType: { type: String, default: null },
  /**
   * Zone mise en avant pour le guide d’anatomie :
   * `chakra` | `figures` | `effects` | `identity` | null.
   */
  highlightRegion: {
    type: String,
    default: null,
    validator: v =>
      v == null || ['chakra', 'figures', 'effects', 'identity'].includes(v),
  },
});

const emit = defineEmits(['select']);

const { t, te, locale } = useI18n();

const tiltStyle = ref(null);
const reduceMotion = ref(false);

if (props.tilt && typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduceMotion.value = mq.matches;
  const onChange = () => {
    reduceMotion.value = mq.matches;
  };
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
  else if (typeof mq.addListener === 'function') mq.addListener(onChange);
}

const name = computed(() => localizedName(props.card, locale.value));

const rarityKey = computed(() => props.card.rarity || 'common');
const rarityClass = computed(() => `card-display--${rarityKey.value}`);
const rarity = computed(() => rarityVisual(props.card.rarity));
const rarityLevel = computed(() => rarity.value.pips || 1);

const typeLabel = computed(() => t(`cards.types.${props.card.type}`, props.card.type));
const typeVisual = computed(() => cardTypeVisual(props.card.type));
const combatRoleLabel = computed(() => {
  const role = props.card.combatRole;
  if (typeof role !== 'string' || !role) return null;
  const key = `cards.combatRoles.${role}`;
  return te(key) ? t(key) : null;
});

const elementKey = computed(() => String(props.card.element || '').toLowerCase());
const elementLabel = computed(() => {
  if (!elementKey.value) return '';
  const key = elementLabelKey(elementKey.value);
  if (key && te(key)) return t(key);
  if (te(`shop.elements.${elementKey.value}`)) return t(`shop.elements.${elementKey.value}`);
  return props.card.element;
});
const elementToneName = computed(() => elementTone(elementKey.value));

const effectParts = computed(() =>
  cardEffectParts(props.card, props.stats, { t, te, locale: locale.value }, {
    previousCardStatType: props.previousCardStatType,
  })
);

function artLabelForKey(key) {
  if (key === 'heredite' || key === 'medicine') {
    return te('cards.stats.medicine') ? t('cards.stats.medicine') : 'Médecine';
  }
  return te(`cards.stats.${key}`) ? t(`cards.stats.${key}`) : key;
}

const familyKey = computed(() => cardFamilyKey(props.card));
const familyLabel = computed(() => artLabelForKey(familyKey.value));

const secondaryArt = computed(() => cardSecondaryArt(props.card));
const secondaryFamilyKey = computed(() =>
  secondaryArt.value ? cardFamilyKey(secondaryArt.value) : null
);
const secondaryArtLabel = computed(() =>
  secondaryArt.value ? artLabelForKey(secondaryFamilyKey.value || secondaryArt.value) : ''
);

const bonusChips = computed(() => cardBonusChips(props.card));

const artUrl = computed(() => resolveCardArt(props.card));
const cost = computed(() => props.card.cost ?? props.card.baseCost ?? 0);

/** Flip structure only when booster controls `face`. */
const enableFlip = computed(() => props.face != null);

const isFlipped = computed(() => props.face === 'back');

const serialLabel = computed(() => {
  if (props.catalogueNumber != null) {
    return t('cards.serialNumber', { n: String(props.catalogueNumber).padStart(3, '0') });
  }
  return t('cards.serialBrand');
});

function onSelect() {
  emit('select', props.card);
}

function onPointerMove(event) {
  if (!props.tilt || reduceMotion.value || isFlipped.value) return;
  if (event.pointerType === 'touch') return;
  const el = event.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (event.clientX - r.left) / r.width - 0.5;
  const y = (event.clientY - r.top) / r.height - 0.5;
  tiltStyle.value = {
    transform: `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`,
  };
}

function onPointerLeave() {
  tiltStyle.value = null;
}

watch(
  () => props.face,
  () => {
    tiltStyle.value = null;
  }
);
</script>

<template>
  <div
    class="card-display"
    :class="[
      rarityClass,
      {
        'card-display--selected': selected,
        'card-display--compact': compact,
        'card-display--large': size === 'large',
        'card-display--foil': rarity.foil,
        'card-display--no-art': !artUrl,
        'card-display--flipped': isFlipped,
        'card-display--flip': enableFlip,
        'card-display--guide': Boolean(highlightRegion),
        [`card-display--guide-${highlightRegion}`]: Boolean(highlightRegion),
      },
    ]"
    :data-tone="typeVisual.tone"
    :data-rarity="rarityKey"
    :data-rarity-level="rarityLevel"
    :data-family="familyKey"
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
        :disabled="disabled"
        :aria-pressed="pressed == null ? selected : pressed"
        :aria-keyshortcuts="keyshortcuts"
        :aria-description="description"
        @click="onSelect"
      >
        <div
          class="card-display__kind"
          :data-tone="typeVisual.tone"
          data-testid="card-type"
          :title="typeLabel"
        >
          {{ typeLabel }}
        </div>

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
          class="card-display__art-banners"
          :class="{ 'card-display__guide-hot': highlightRegion === 'identity' }"
          data-testid="card-scale-hint"
        >
          <div v-if="quantity != null || upgradeLevel > 0" class="card-display__top-left">
            <span
              v-if="quantity != null"
              class="card-display__qty"
              :title="t('cards.quantityLabel')"
            >
              ×{{ quantity }}
            </span>
            <span
              v-if="upgradeLevel > 0"
              class="card-display__upgrade"
              :title="t('cards.upgraded', { level: upgradeLevel })"
            >
              +{{ upgradeLevel }}
            </span>
          </div>
          <div
            v-if="elementLabel"
            class="card-display__element"
            :class="`card-display__element--${elementKey}`"
            :data-tone="elementToneName"
            :title="elementLabel"
            data-testid="card-element"
          >
            <span class="card-display__element-dot" aria-hidden="true" />
            {{ elementLabel }}
          </div>
          <div
            v-if="secondaryArtLabel"
            class="card-display__category card-display__category--secondary"
            :class="`card-display__category--${secondaryFamilyKey}`"
            :title="secondaryArtLabel"
            data-testid="card-secondary-art"
          >
            {{ secondaryArtLabel }}
          </div>
          <div
            class="card-display__category"
            :class="`card-display__category--${familyKey}`"
            :title="familyLabel"
          >
            {{ familyLabel }}
          </div>
        </div>

        <div class="card-display__figures">
          <div
            class="card-display__chakra"
            :class="{ 'card-display__guide-hot': highlightRegion === 'chakra' }"
            :title="t('cards.costLabel')"
            data-testid="card-cost"
          >
            <span class="card-display__chakra-gem" aria-hidden="true" />
            <span class="card-display__chakra-number">{{ cost }}</span>
          </div>
          <div
            v-for="figure in effectParts.figures"
            :key="figure.key"
            class="card-display__figure"
            :class="[
              `card-display__figure--${figure.key}`,
              { 'card-display__guide-hot': highlightRegion === 'figures' },
            ]"
            :title="`${t(`cards.${figure.key}`, { n: stats ? figure.effective : figure.base })}${figure.scaled && stats ? ` · ${t('cards.baseValue', { n: figure.base })}` : ''}`"
          >
            <span class="card-display__chakra-gem" aria-hidden="true" />
            <span class="card-display__chakra-number">{{
              stats ? figure.effective : figure.base
            }}</span>
          </div>
        </div>

        <section class="card-display__info">
          <div class="card-display__info-columns">
            <div
              class="card-display__description"
              :class="{ 'card-display__guide-hot': highlightRegion === 'effects' }"
            >
              <h3 class="card-display__name">{{ name }}</h3>
              <div class="card-display__rule" aria-hidden="true" />
              <ul
                v-if="effectParts.texts.length"
                class="card-display__effects"
                :aria-label="effectParts.aria.join(', ')"
              >
                <li
                  v-for="(entry, i) in effectParts.texts"
                  :key="i"
                  :class="{
                    'card-display__effect--combo': entry.kind === 'combo',
                    'card-display__effect--combo-active': entry.active,
                    [`card-display__effect--art-${entry.art}`]: entry.active && entry.art,
                  }"
                >
                  {{ entry.text }}
                </li>
              </ul>
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
                :style="{ '--fill': chip.fill }"
                :title="`${t(`cards.stats.${chip.key}`, chip.key)} ${chip.value > 0 ? '+' : ''}${chip.value}`"
              >
                <img class="card-display__bonus-icon" :src="chip.icon" alt="" />
                <span>{{ chip.value > 0 ? `+${chip.value}` : chip.value }}</span>
              </div>
            </div>
          </div>

          <footer
            class="card-display__footer"
            :class="{ 'card-display__guide-hot': highlightRegion === 'identity' }"
          >
            <span
              v-if="catalogueNumber != null || !combatRoleLabel"
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
            <span
              v-if="combatRoleLabel"
              class="card-display__combat-role"
              :title="t('cards.combatRoleLabel', { role: combatRoleLabel })"
            >
              {{ combatRoleLabel }}
            </span>
            <div class="card-display__rarity" :aria-label="t(`cards.rarities.${rarityKey}`)">
              <span class="card-display__rarity-name">{{ t(`cards.rarities.${rarityKey}`) }}</span>
              <span class="card-display__rarity-pips" aria-hidden="true">
                <i v-for="n in rarityLevel" :key="n" class="card-display__diamond" />
              </span>
            </div>
          </footer>
        </section>

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
 * Anatomie carte V5 :
 * type (bandeau haut) → art → bannières arts (rectangles) → gemme chakra
 * → info (description | bonus carrés) → footer.
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

/* Art — hauteur relative ≈ 256/444 du prototype.
 * Sur cartes étroites (mobile 2-col), on réduit l’art pour agrandir
 * la zone description (parchemin) et éviter le texte compressé. */
.card-display__art {
  height: 50%;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  /* coins haut seulement — bas collé au parchemin, sans espace */
  border-radius: 5px 5px 0 0;
  margin: 0;
  background: #4e6578;
}

@container (max-width: 11.5rem) {
  .card-display__art {
    height: 44%;
  }

  .card-display__info {
    padding: 12px 12px 0;
  }

  .card-display__rule {
    margin: 8px 0 7px;
  }

  .card-display__footer {
    height: 26px;
    margin: 6px -12px 0;
  }
}

.card-display__art::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Pas de fondu bas : l’art doit coller le bord du parchemin */
  background: linear-gradient(90deg, #111a2633, transparent 24%, transparent 75%, #111a2633);
}

.card-display--mythic .card-display__art::after {
  background: linear-gradient(90deg, #d5a75320, transparent 24%, transparent 75%, #d5a75320);
}

.card-display__art--placeholder {
  display: grid;
  place-items: center;
}

.card-display__art-img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center bottom;
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

/* Type de carte — bandeau noir collé en haut à droite, derrière le chakra */
.card-display__kind {
  position: absolute;
  z-index: 11;
  right: 0;
  left: auto;
  top: 0;
  max-width: min(70%, 9rem);
  /* padding-right sous la gemme : le libellé reste entièrement lisible */
  padding: 0.22rem 2.75rem 0.22rem 0.55rem;
  background: #000;
  color: #fff;
  font-family: var(--font-display);
  font-size: clamp(0.5rem, 3.6cqi, 0.65rem);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

/* Coin haut gauche : qty → élément → art secondaire → art primaire
 * (pile haute pour laisser le bas de l’illustration libre) */
.card-display__art-banners {
  position: absolute;
  z-index: 10;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.18rem;
  max-width: calc(100% - 4.25rem);
  pointer-events: none;
}

.card-display__top-left {
  display: flex;
  align-items: center;
  gap: 0.22rem;
}

.card-display__category {
  max-width: 100%;
  padding: 0.35rem 0.7rem;
  background: #d8513d;
  color: #fff;
  font-family: var(--font-display);
  font-size: clamp(0.62rem, 4.4cqi, 0.8125rem);
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-display__category--secondary {
  padding: 0.22rem 0.55rem;
  font-size: clamp(0.5rem, 3.6cqi, 0.68rem);
  font-weight: 800;
  letter-spacing: 0.09em;
  opacity: 0.95;
}

.card-display__category--common {
  background: #6b7280;
}

.card-display__category--ninjutsu {
  background: #3776af;
}

.card-display__category--genjutsu {
  background: #8653b4;
}

.card-display__category--heredite {
  background: #408b68;
}

/* Élément (Katon, Raiton…) — pastille petite au-dessus des arts */
.card-display__element {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  max-width: 100%;
  padding: 0.12rem 0.4rem 0.12rem 0.28rem;
  background: var(--tone-fill, #697580);
  color: #fff;
  font-family: var(--font-display);
  font-size: clamp(0.42rem, 3cqi, 0.55rem);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-display__element--katon {
  background: #d8513d;
}

.card-display__element--suiton {
  background: #3776af;
}

.card-display__element--raiton {
  background: #c9a227;
}

.card-display__element--doton {
  background: #8c5c3e;
}

.card-display__element--futon {
  background: #408b68;
}

.card-display__element-dot {
  flex-shrink: 0;
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 1px;
  background: #fff;
  opacity: 0.9;
}

/* Gemme chakra — coin haut droit débordant (cyan / or) */
.card-display__chakra {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  filter: drop-shadow(3px 6px 3px #070b13a9);
  --gem-light: #e8fbff;
  --gem-highlight: #7ed7f2;
  --gem-mid: #0e7490;
  --gem-shadow: #0c4a6e;
  --gem-border: #f5d78e;
  --gem-glow: #cffafe;
}

.card-display__chakra-gem {
  position: absolute;
  inset: 15%;
  transform: rotate(45deg);
  background: linear-gradient(
    135deg,
    var(--gem-light, #e8fbff) 0%,
    var(--gem-highlight, #7ed7f2) 24%,
    var(--gem-mid, #0e7490) 50%,
    var(--gem-shadow, #0c4a6e) 56%,
    var(--gem-highlight, #7ed7f2) 81%,
    var(--gem-light, #fff7d6) 100%
  );
  border: 2px solid var(--gem-border, #f5d78e);
  box-shadow:
    inset 0 0 0 3px var(--gem-shadow, #0c4a6e),
    inset 0 0 12px var(--gem-glow, #cffafe);
}

.card-display__chakra-gem::after {
  content: '';
  position: absolute;
  inset: 5px;
  background: linear-gradient(145deg, #fff8, transparent 50%, #071f4b80);
  clip-path: polygon(0 0, 100% 0, 50% 50%, 100% 100%, 0 100%, 50% 50%);
}

.card-display__figures {
  position: absolute;
  z-index: 13;
  top: -13px;
  right: -12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: clamp(2.6rem, 24.7%, 4.5625rem);
  pointer-events: none;
}

.card-display__figure {
  position: relative;
  width: 84%;
  aspect-ratio: 1;
  filter: drop-shadow(2px 4px 3px #070b1380);
}

.card-display__figure--damage {
  --gem-light: #fecaca;
  --gem-highlight: #f87171;
  --gem-mid: #dc2626;
  --gem-shadow: #7f1d1d;
  --gem-border: #fb7185;
  --gem-glow: #fda4af;
}

.card-display__figure--block {
  --gem-light: #fde68a;
  --gem-highlight: #d97706;
  --gem-mid: #92400e;
  --gem-shadow: #451a03;
  --gem-border: #fbbf24;
  --gem-glow: #fcd34d;
}

.card-display__figure--heal {
  --gem-light: #bbf7d0;
  --gem-highlight: #4ade80;
  --gem-mid: #16a34a;
  --gem-shadow: #14532d;
  --gem-border: #86efac;
  --gem-glow: #6ee7b7;
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

.card-display__figure .card-display__chakra-number {
  font-size: clamp(0.85rem, 8.4cqi, 1.575rem);
}

/* Bloc info — fond parchemin */
.card-display__info {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  container-type: inline-size;
  background: linear-gradient(145deg, #f4e9d8, #e0d0b8);
  color: #27313b;
  padding: 14px 15px 0;
}

.card-display__info-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.card-display__info-columns:not(:has(.card-display__bonuses)) {
  grid-template-columns: minmax(0, 1fr);
}

.card-display__description {
  min-width: 0;
  min-height: 0;
}

.card-display__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(0.85rem, 8.4cqi, 1.5625rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.015em;
  text-transform: uppercase;
  color: #27313b;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-display__rule {
  height: 1px;
  background: #bca78d;
  margin: 8px 0;
}

.card-display__effects {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: clamp(0.6rem, 3.8cqi, 0.72rem);
  font-weight: 700;
  line-height: 1.35;
  color: #27313b;
}

.card-display__effect--combo-active {
  font-weight: 900;
}

.card-display__effect--art-taijutsu {
  color: #b45309;
}

.card-display__effect--art-ninjutsu {
  color: #1d4ed8;
}

.card-display__effect--art-genjutsu {
  color: #7e22ce;
}

.card-display__effect--art-medicine {
  color: #15803d;
}

/* Bonus passifs — icône de statistique + valeur */
.card-display__bonuses {
  border-left: 1px solid #c8b59d;
  padding-left: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  justify-content: center;
  min-width: 0;
}

.card-display__bonus {
  display: inline-flex;
  min-width: 2.15rem;
  height: 1.5rem;
  align-items: center;
  justify-content: flex-start;
  gap: 0.18rem;
  color: var(--fill, #8c5c3e);
  font-family: var(--font-display);
  font-size: clamp(0.52rem, 3.4cqi, 0.68rem);
  font-weight: 900;
  line-height: 1;
}

.card-display__bonus-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex: none;
  object-fit: contain;
}

.card-display__bonus span {
  font-variant-numeric: tabular-nums;
}

/* Footer : numéro de catalogue, rôle de combat et rareté */
.card-display__footer {
  height: 29px;
  margin: 8px -15px 0;
  padding: 0 14px;
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

.card-display__combat-role {
  font-size: 0.625rem;
  font-weight: 700;
  color: #655442;
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
  display: inline-grid;
  place-items: center;
  min-width: 1.35rem;
  height: 1.15rem;
  padding: 0 0.28rem;
  border-radius: 0.15rem;
  background: #000;
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 800;
  line-height: 1;
  color: #fff;
  pointer-events: none;
}

.card-display__upgrade {
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
  background: linear-gradient(
    112deg,
    transparent 15%,
    #a8e5ff19 37%,
    #d6f5ff4d 47%,
    transparent 60%
  );
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
  padding: 10px 10px 0;
}

.card-display--compact .card-display__info-columns {
  grid-template-columns: minmax(0, 1fr) 32px;
  gap: 5px;
}

.card-display--compact .card-display__info-columns:not(:has(.card-display__bonuses)) {
  grid-template-columns: minmax(0, 1fr);
}

.card-display--compact .card-display__name {
  font-size: clamp(0.7rem, 7cqi, 1.1rem);
}

.card-display--compact .card-display__rule {
  margin: 6px 0;
}

.card-display--compact .card-display__effects {
  gap: 0.2rem;
  font-size: 0.6rem;
}

.card-display--compact .card-display__figures {
  top: -9px;
  right: -8px;
}

.card-display--compact .card-display__bonuses {
  padding-left: 6px;
  gap: 4px;
}

.card-display--compact .card-display__bonus {
  min-width: 1.8rem;
  height: 1.15rem;
  font-size: 0.55rem;
}

.card-display--compact .card-display__footer {
  height: 24px;
  margin: 6px -10px 0;
  padding: 0 10px;
}

.card-display--compact .card-display__rarity-name {
  display: none;
}

.card-display--compact .card-display__kind {
  padding: 0.15rem 2.85rem 0.15rem 0.4rem;
  font-size: clamp(0.42rem, 3.2cqi, 0.55rem);
  background: #000;
  color: #fff;
}

.card-display--compact .card-display__art-banners {
  top: 0;
  gap: 0.12rem;
  max-width: calc(100% - 3.5rem);
}

.card-display--compact .card-display__category {
  padding: 0.22rem 0.45rem;
  font-size: clamp(0.48rem, 3.8cqi, 0.62rem);
}

.card-display--compact .card-display__category--secondary {
  padding: 0.15rem 0.38rem;
  font-size: clamp(0.4rem, 3.2cqi, 0.52rem);
}

.card-display--compact .card-display__element {
  padding: 0.12rem 0.38rem 0.12rem 0.28rem;
  font-size: clamp(0.4rem, 3.2cqi, 0.52rem);
  gap: 0.2rem;
}

.card-display--compact .card-display__element-dot {
  width: 0.35rem;
  height: 0.35rem;
}

.card-display--compact .card-display__back-logo {
  width: 4.5rem !important;
  height: 4.5rem !important;
}

.card-display--compact .card-display__back-title {
  margin-top: 12px;
  font-size: 0.85rem;
}

/* Large (desktop) — mêmes proportions, plafonds de typo relevés pour la lisibilité */
.card-display--large .card-display__name {
  font-size: clamp(0.95rem, 8.4cqi, 1.75rem);
}

.card-display--large .card-display__effects {
  font-size: clamp(0.68rem, 4.4cqi, 0.92rem);
  gap: 0.32rem;
}

.card-display--large .card-display__kind {
  font-size: clamp(0.55rem, 3.8cqi, 0.72rem);
}

.card-display--large .card-display__category {
  font-size: clamp(0.7rem, 4.6cqi, 0.9rem);
}

.card-display--large .card-display__category--secondary {
  font-size: clamp(0.55rem, 3.8cqi, 0.75rem);
}

.card-display--large .card-display__element {
  font-size: clamp(0.48rem, 3.4cqi, 0.65rem);
}

.card-display--large .card-display__bonus {
  font-size: clamp(0.58rem, 3.6cqi, 0.78rem);
}

.card-display--large .card-display__rarity-name,
.card-display--large .card-display__serial {
  font-size: 0.7rem;
}

.card-display--large .card-display__combat-role {
  font-size: 0.7rem;
}

.card-display--large.card-display--compact .card-display__name {
  font-size: clamp(0.8rem, 7.4cqi, 1.25rem);
}

.card-display--large.card-display--compact .card-display__effects {
  font-size: clamp(0.65rem, 4.2cqi, 0.82rem);
}

.card-display--large.card-display--compact .card-display__bonus {
  font-size: 0.62rem;
}

/* Guide d’anatomie — voile + pulse de la zone ciblée (évite opacity parent). */
.card-display--guide .card-display__face--front::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 18;
  pointer-events: none;
  background: rgb(7 11 19 / 0.52);
  border-radius: inherit;
}

/*
 * Remonter la zone ciblée au-dessus du voile sans casser le layout :
 * figures / banners restent absolute ; info (flex) passe en relative.
 */
.card-display--guide-chakra .card-display__figures,
.card-display--guide-figures .card-display__figures,
.card-display--guide-identity .card-display__art-banners {
  z-index: 20;
}

.card-display--guide-effects .card-display__info,
.card-display--guide-identity .card-display__info {
  position: relative;
  z-index: 20;
}

.card-display--guide .card-display__guide-hot {
  z-index: 21;
  filter: drop-shadow(0 0 10px #f5d78ecc);
  animation: card-guide-pulse 1.4s ease-in-out infinite;
}

/* Éléments en flux (description / footer) : relative pour activer le z-index. */
.card-display--guide .card-display__description.card-display__guide-hot,
.card-display--guide .card-display__footer.card-display__guide-hot {
  position: relative;
}

/* Pendant l’étape gemmes, laisser le coût sous le voile visuel. */
.card-display--guide-figures .card-display__chakra:not(.card-display__guide-hot) {
  opacity: 0.35;
}

.card-display--guide-chakra .card-display__figure:not(.card-display__guide-hot) {
  opacity: 0.35;
}

.card-display--guide-effects .card-display__bonuses,
.card-display--guide-effects .card-display__footer,
.card-display--guide-identity .card-display__description,
.card-display--guide-identity .card-display__bonuses {
  opacity: 0.35;
}

@keyframes card-guide-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 6px #f5d78e99);
  }
  50% {
    filter: drop-shadow(0 0 14px #f5d78e);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-display,
  .card-display--flip .card-display__flipper,
  .card-display__sheen {
    transition: none !important;
  }

  .card-display--guide .card-display__guide-hot {
    animation: none;
  }
}
</style>
