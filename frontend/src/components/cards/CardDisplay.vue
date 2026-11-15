<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveCardArt } from '../../utils/cardArt'
import { cardTypeVisual, elementLabelKey, elementTone, rarityVisual } from '../../utils/cardVisuals'
import { localizedDescription, localizedField, localizedName } from '../../utils/localeContent.js'
import { previewCardFigures, scalingStatKey } from '../../utils/cardScaling'

defineOptions({ name: 'CardDisplay' })

const props = defineProps({
  card: { type: Object, required: true },
  quantity: { type: Number, default: null },
  upgradeLevel: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  /** Stats du ninja : si fournies, les figures affichent la valeur effective. */
  stats: { type: Object, default: null },
})

defineEmits(['select'])

const { t, te, locale } = useI18n()

const name = computed(() => localizedName(props.card, locale.value))
const description = computed(() => localizedDescription(props.card, locale.value))
const passiveDescription = computed(() =>
  localizedField(props.card, 'passiveDescription', locale.value)
)

const rarityKey = computed(() => props.card.rarity || 'common')
const rarityClass = computed(() => `card-display--${rarityKey.value}`)

const passiveEntries = computed(() => {
  const bonus = props.card.passiveBonus || {}
  return Object.entries(bonus)
    .filter(([, v]) => Number(v) !== 0)
    .map(([key, value]) => ({
      key,
      value: Number(value),
      label: t(`cards.stats.${key}`, key),
    }))
})

const typeLabel = computed(() => t(`cards.types.${props.card.type}`, props.card.type))

const typeVisual = computed(() => cardTypeVisual(props.card.type))
const rarity = computed(() => rarityVisual(props.card.rarity))
const rarityLabel = computed(() => {
  const key = `cards.rarities.${rarityKey.value}`
  return te(key) ? t(key) : props.card.rarity
})
const elementLabel = computed(() => {
  const key = elementLabelKey(props.card.element)
  if (!key) return ''
  return te(key) ? t(key) : props.card.element
})

const showEffective = computed(() => Boolean(props.stats))

const figures = computed(() =>
  previewCardFigures(props.card, props.stats).map((entry) => {
    const display = showEffective.value ? entry.effective : entry.base
    const fullKey =
      entry.key === 'damage'
        ? 'cards.damage'
        : entry.key === 'block'
          ? 'cards.block'
          : 'cards.heal'
    const labelKey =
      entry.key === 'damage'
        ? 'cards.statDamage'
        : entry.key === 'block'
          ? 'cards.statBlock'
          : 'cards.statHeal'
    return {
      ...entry,
      display,
      label: t(labelKey),
      full: fullKey,
      aria: showEffective.value && entry.scaled
        ? t('cards.statEffectiveAria', {
            n: entry.effective,
            base: entry.base,
            stat: t(`cards.stats.${entry.statKey}`, entry.statKey),
          })
        : t(fullKey, { n: display }),
    }
  })
)

/** Indices de scaling (collection / deck / shop) — une ligne par figure. */
const scaleHints = computed(() => {
  if (showEffective.value) return []
  const seen = new Set()
  const hints = []
  for (const key of ['damage', 'block', 'heal']) {
    if (!(Number(props.card[key]) > 0)) continue
    const statKey = scalingStatKey(props.card, key)
    if (!statKey || seen.has(statKey)) continue
    seen.add(statKey)
    hints.push({
      statKey,
      label: t('cards.scalesWith', { stat: t(`cards.stats.${statKey}`, statKey) }),
    })
  }
  return hints
})

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
      },
    ]"
    :data-tone="typeVisual.tone"
    :data-rarity="rarityKey"
    :aria-pressed="selected"
    data-testid="card-display"
    @click="$emit('select', card)"
  >
    <span class="card-display__frame" aria-hidden="true" />
    <span class="card-display__foil" aria-hidden="true" />

    <!-- Fenêtre d'illustration + pip de coût -->
    <div class="card-display__art-wrap">
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

      <span class="card-display__cost" :title="t('cards.costLabel')">
        <span class="card-display__cost-ring" aria-hidden="true" />
        <span class="card-display__cost-value">{{ cost }}</span>
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
    </div>

    <!-- Plaque nom + type / élément -->
    <div class="card-display__nameplate" :data-tone="typeVisual.tone">
      <span class="card-display__type-icon" aria-hidden="true">
        <span class="shape" :class="`shape--${typeVisual.shape}`" />
      </span>
      <h3 class="card-display__name">{{ name }}</h3>
      <span class="card-display__type-meta">
        <span class="card-display__type-label">{{ typeLabel }}</span>
        <span
          v-if="elementLabel"
          class="card-display__element"
          :data-tone="elementTone(card.element)"
        >
          <span class="dot" aria-hidden="true" />
          {{ elementLabel }}
        </span>
      </span>
    </div>

    <!-- Boîte de règles -->
    <div class="card-display__rules">
      <p v-if="!compact" class="card-display__desc">{{ description }}</p>

      <div v-if="figures.length" class="card-display__stats">
        <span
          v-for="entry in figures"
          :key="entry.key"
          class="card-display__stat"
          :class="`card-display__stat--${entry.key}`"
          :aria-label="entry.aria"
        >
          <span class="card-display__stat-value" aria-hidden="true">{{ entry.display }}</span>
          <span class="card-display__stat-meta" aria-hidden="true">
            <span class="card-display__stat-label">{{ entry.label }}</span>
            <span
              v-if="showEffective && entry.scaled"
              class="card-display__stat-base"
              :title="t('cards.baseValue', { n: entry.base })"
            >
              {{ t('cards.baseShort', { n: entry.base }) }}
            </span>
          </span>
        </span>
      </div>

      <p
        v-for="hint in scaleHints"
        :key="hint.statKey"
        class="card-display__scale"
        data-testid="card-scale-hint"
      >
        {{ hint.label }}
      </p>

      <div v-if="passiveEntries.length" class="card-display__passive" data-testid="card-passive">
        <p class="card-display__passive-label">
          <span class="lozenge lozenge--hollow" aria-hidden="true" />
          {{ t('cards.passiveBonus') }}
        </p>
        <ul class="card-display__passive-list">
          <li v-for="entry in passiveEntries" :key="entry.key">
            <span class="card-display__passive-value">+{{ entry.value }}</span>
            {{ entry.label }}
          </li>
        </ul>
        <p v-if="passiveDescription && !compact" class="card-display__passive-hint">
          {{ passiveDescription }}
        </p>
      </div>
    </div>

    <!-- Gemme de rareté / marque de set -->
    <footer class="card-display__footer" :data-tone="rarity.tone">
      <span class="card-display__gem" aria-hidden="true">
        <span v-for="n in rarity.pips" :key="n" class="lozenge" />
      </span>
      <span class="card-display__rarity-label">{{ rarityLabel }}</span>
    </footer>
  </button>
</template>

<style scoped>
.card-display {
  --card-rarity: var(--color-line-strong);
  --card-rarity-soft: var(--color-bg-soft);
  --card-rarity-glow: transparent;
  --card-frame: color-mix(in srgb, var(--color-ink) 88%, var(--card-rarity));
  --card-inner: color-mix(in srgb, var(--color-bg-card) 92%, var(--card-rarity-soft));

  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  aspect-ratio: 2.5 / 3.5;
  overflow: hidden;
  padding: 0.42rem 0.42rem 0.5rem;
  border: 0;
  border-radius: 0.85rem;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--card-rarity) 55%, var(--card-frame)) 0%,
      var(--card-frame) 38%,
      color-mix(in srgb, var(--card-rarity) 35%, var(--card-frame)) 100%
    );
  color: var(--color-ink);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 45%, transparent),
    0 10px 22px color-mix(in srgb, var(--color-ink) 18%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--color-on-ink) 18%, transparent);
  text-align: left;
  outline: 0 solid var(--color-ink);
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    box-shadow var(--dur-base) ease,
    outline-width var(--dur-fast) ease;
}

.card-display__frame {
  pointer-events: none;
  position: absolute;
  inset: 0.28rem;
  z-index: 0;
  border-radius: 0.62rem;
  background: var(--card-inner);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--card-rarity) 28%, transparent);
}

.card-display--common {
  --card-rarity: var(--color-neutral-fill);
  --card-rarity-soft: var(--color-bg-soft);
}

.card-display--rare {
  --card-rarity: var(--color-sky);
  --card-rarity-soft: var(--color-sky-tint);
  --card-rarity-glow: color-mix(in srgb, var(--color-sky-fill) 35%, transparent);
}

.card-display--legendary {
  --card-rarity: var(--color-gold);
  --card-rarity-soft: var(--color-gold-tint);
  --card-rarity-glow: color-mix(in srgb, var(--color-gold-fill) 40%, transparent);
}

.card-display--mythic {
  --card-rarity: var(--color-vermilion);
  --card-rarity-soft: var(--color-vermilion-tint);
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
  opacity: 0.55;
}

.card-display--foil:hover .card-display__foil,
.card-display--selected .card-display__foil {
  opacity: 0.9;
  animation: card-foil-sweep 1.6s var(--ease-out-quint) 1;
}

.card-display:hover {
  transform: translateY(-5px) rotateX(2deg);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 55%, transparent),
    0 16px 28px color-mix(in srgb, var(--color-ink) 22%, transparent),
    0 0 18px var(--card-rarity-glow);
}

.card-display:active {
  transform: translateY(-1px);
}

.card-display--selected,
.card-display--selected:hover {
  outline-width: 3px;
  transform: translateY(-5px);
}

.card-display:focus-visible {
  outline: 3px solid var(--color-indigo);
  outline-offset: 3px;
}

.card-display__art-wrap,
.card-display__nameplate,
.card-display__rules,
.card-display__footer {
  position: relative;
  z-index: 1;
}

.card-display__art-wrap {
  position: relative;
  flex: 0 0 auto;
  margin: 0.12rem 0.12rem 0;
}

.card-display__art {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 0.92;
  border: 2px solid color-mix(in srgb, var(--card-rarity) 55%, var(--color-ink));
  border-radius: 0.35rem 0.35rem 0.15rem 0.15rem;
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--tone-fill) 35%, var(--color-bg-soft)) 0%,
      var(--color-bg-soft) 100%
    );
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-ink) 35%, transparent);
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
  opacity: 0.55;
}

.card-display__cost {
  position: absolute;
  top: -0.35rem;
  left: -0.35rem;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
}

.card-display__cost-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-gold-fill) 85%, white), var(--color-gold) 55%, color-mix(in srgb, var(--color-ink) 55%, var(--color-gold)) 100%);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--color-ink) 75%, transparent),
    0 2px 6px color-mix(in srgb, var(--color-ink) 35%, transparent);
}

.card-display__cost-value {
  position: relative;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--color-ink);
  text-shadow: 0 1px 0 color-mix(in srgb, var(--color-on-ink) 35%, transparent);
}

.card-display__qty,
.card-display__upgrade {
  position: absolute;
  z-index: 3;
  display: inline-grid;
  place-items: center;
  min-width: 1.55rem;
  height: 1.35rem;
  padding: 0 0.3rem;
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--color-ink) 78%, transparent);
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1;
  color: var(--color-on-ink);
}

.card-display__qty {
  top: 0.35rem;
  right: 0.35rem;
}

.card-display__upgrade {
  top: 0.35rem;
  right: 2.15rem;
  border: 1px solid color-mix(in srgb, var(--color-gold-fill) 70%, transparent);
}

.card-display__nameplate {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 0.1rem 0.45rem;
  align-items: center;
  margin: 0.35rem 0.12rem 0;
  padding: 0.35rem 0.45rem 0.4rem;
  background: var(--tone-fill);
  color: var(--tone-on);
  border-radius: 0.2rem;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-ink) 25%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--color-on-ink) 18%, transparent);
}

.card-display__type-icon {
  grid-row: 1 / span 2;
  display: grid;
  place-items: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-ink) 28%, transparent);
  font-size: 0.85rem;
}

.card-display__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 800;
  font-stretch: 88%;
  line-height: 1.05;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.card-display__type-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.45rem;
  min-width: 0;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.92;
}

.card-display__element {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.05rem 0.3rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink) 22%, transparent);
}

.card-display__element .dot {
  font-size: 0.55rem;
  color: var(--tone-fill);
}

.card-display__rules {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.3rem;
  min-height: 0;
  margin: 0.35rem 0.12rem 0;
  padding: 0.45rem 0.5rem 0.5rem;
  border-radius: 0.2rem;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-bg-soft) 70%, var(--card-rarity-soft)) 0%,
      color-mix(in srgb, var(--color-bg-card) 88%, var(--card-rarity-soft)) 100%
    );
  border: 1px solid color-mix(in srgb, var(--card-rarity) 22%, var(--color-line));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-ink) 6%, transparent);
}

.card-display__desc {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-display__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  margin-top: auto;
  padding-top: 0.2rem;
}

.card-display__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
}

.card-display__stat-value {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.95;
}

.card-display__stat-meta {
  display: inline-flex;
  flex-direction: column;
  gap: 0.02rem;
}

.card-display__stat-label {
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.card-display__stat-base {
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.card-display__stat--damage .card-display__stat-value {
  color: var(--color-accent);
}

.card-display__stat--block .card-display__stat-value {
  color: var(--color-indigo);
}

.card-display__stat--heal .card-display__stat-value {
  color: var(--color-leaf);
}

.card-display__scale {
  margin: 0;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-ink-muted);
}

.card-display__passive {
  margin-top: 0.15rem;
  padding-top: 0.3rem;
  border-top: 1px dashed color-mix(in srgb, var(--color-line-strong) 70%, transparent);
}

.card-display__passive-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.card-display__passive-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.05rem 0.55rem;
  margin: 0.2rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--color-ink);
}

.card-display__passive-value {
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-indigo);
}

.card-display__passive-hint {
  margin: 0.15rem 0 0;
  font-size: 0.62rem;
  font-style: italic;
  line-height: 1.3;
  color: var(--color-ink-faint);
}

.card-display__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.3rem;
  padding: 0.15rem 0.25rem 0.05rem;
}

.card-display__gem {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--tone-fill) 90%, white), var(--tone-fill));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-ink) 45%, transparent),
    0 1px 3px color-mix(in srgb, var(--color-ink) 25%, transparent);
  font-size: 0.55rem;
  color: var(--tone-on, var(--color-on-ink));
}

.card-display__rarity-label {
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tone);
}

.card-display--compact {
  aspect-ratio: 2.5 / 3.5;
  padding: 0.3rem 0.3rem 0.35rem;
}

.card-display--compact .card-display__cost {
  width: 1.85rem;
  height: 1.85rem;
}

.card-display--compact .card-display__cost-value {
  font-size: 0.95rem;
}

.card-display--compact .card-display__name {
  font-size: 0.78rem;
}

.card-display--compact .card-display__art {
  aspect-ratio: 1 / 0.88;
}

.card-display--compact .card-display__desc {
  -webkit-line-clamp: 2;
  font-size: 0.62rem;
}

.card-display--compact .card-display__stat-value {
  font-size: 1rem;
}

.card-display--compact .card-display__nameplate {
  padding: 0.25rem 0.35rem 0.28rem;
}

.card-display--compact .card-display__rules {
  padding: 0.3rem 0.35rem 0.35rem;
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
