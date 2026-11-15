<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
      },
    ]"
    :data-tone="typeVisual.tone"
    :data-rarity="rarityKey"
    :aria-pressed="selected"
    data-testid="card-display"
    @click="$emit('select', card)"
  >
    <span class="card-display__foil" aria-hidden="true" />
    <span class="card-display__rarity-edge" aria-hidden="true" />

    <header class="card-display__header">
      <span class="card-display__cost" :title="t('cards.costLabel')">
        {{ card.cost ?? card.baseCost ?? 0 }}
      </span>
      <span class="card-display__type">
        <span class="shape" :class="`shape--${typeVisual.shape}`" aria-hidden="true" />
        {{ typeLabel }}
      </span>
      <span
        v-if="upgradeLevel > 0"
        class="card-display__upgrade"
        :title="t('cards.upgraded', { level: upgradeLevel })"
      >
        +{{ upgradeLevel }}
      </span>
      <span v-if="quantity != null" class="card-display__qty" :title="t('cards.quantityLabel')">
        ×{{ quantity }}
      </span>
    </header>

    <div class="card-display__rarity-band" :data-tone="rarity.tone">
      <span class="card-display__rarity-label">
        <span class="card-display__pips" aria-hidden="true">
          <span v-for="n in rarity.pips" :key="n" class="lozenge" />
        </span>
        {{ rarityLabel }}
      </span>
      <span
        v-if="elementLabel"
        class="card-display__element"
        :data-tone="elementTone(card.element)"
      >
        <span class="dot" aria-hidden="true" />
        {{ elementLabel }}
      </span>
    </div>

    <div class="card-display__body">
      <h3 class="card-display__name">{{ name }}</h3>

      <div class="card-display__effect">
        <p v-if="!compact" class="card-display__label">{{ t('cards.effect') }}</p>
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
      </div>
    </div>

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
  </button>
</template>

<style scoped>
.card-display {
  --card-rarity: var(--color-line-strong);
  --card-rarity-soft: var(--color-bg-soft);
  --card-rarity-glow: transparent;

  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 2px solid var(--card-rarity);
  border-radius: var(--radius-md);
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--card-rarity-soft) 55%, var(--color-bg-card)) 0%,
      var(--color-bg-card) 42%,
      var(--color-bg-card) 100%
    );
  color: var(--color-ink);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--card-rarity) 28%, transparent),
    0 1px 0 color-mix(in srgb, var(--color-ink) 6%, transparent);
  text-align: left;
  outline: 0 solid var(--color-ink);
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    box-shadow var(--dur-base) ease,
    border-color var(--dur-fast) ease,
    outline-width var(--dur-fast) ease;
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
  border-width: 3px;
}

.card-display__foil {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  background:
    linear-gradient(
      125deg,
      transparent 18%,
      color-mix(in srgb, var(--card-rarity) 18%, transparent) 36%,
      color-mix(in srgb, var(--color-bg-card) 55%, transparent) 48%,
      color-mix(in srgb, var(--card-rarity) 22%, transparent) 58%,
      transparent 78%
    );
  background-size: 220% 220%;
  transition: opacity var(--dur-base) ease;
}

.card-display--foil .card-display__foil {
  opacity: 0.55;
}

.card-display--foil:hover .card-display__foil,
.card-display--selected .card-display__foil {
  opacity: 0.85;
  animation: card-foil-sweep 1.6s var(--ease-out-quint) 1;
}

.card-display__rarity-edge {
  pointer-events: none;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  width: 0.28rem;
  background: var(--card-rarity);
  box-shadow: 0 0 12px var(--card-rarity-glow);
}

.card-display:hover {
  transform: translateY(-4px);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--card-rarity) 40%, transparent),
    0 8px 18px color-mix(in srgb, var(--color-ink) 12%, transparent);
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
  outline-offset: 2px;
}

.card-display__header,
.card-display__rarity-band,
.card-display__body,
.card-display__passive {
  position: relative;
  z-index: 1;
}

/* Bandeau type : couleur + coût en grand */
.card-display__header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.85rem;
  padding: 0 0.75rem 0 0;
  background: var(--tone-fill);
  color: var(--tone-on);
}

.card-display__cost {
  display: grid;
  place-items: center;
  align-self: stretch;
  min-width: 2.85rem;
  padding: 0 0.45rem;
  background: var(--color-bg-card);
  font-family: var(--font-display);
  font-size: 1.85rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--color-ink);
  clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%);
}

.card-display__type {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.card-display__upgrade {
  display: inline-grid;
  place-items: center;
  min-width: 1.65rem;
  height: 1.45rem;
  padding: 0 0.35rem;
  border: 1.5px solid color-mix(in srgb, var(--tone-on) 55%, transparent);
  background: color-mix(in srgb, var(--color-ink) 55%, transparent);
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1;
  color: var(--color-on-ink);
}

.card-display__qty {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
}

.card-display__rarity-band {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem 0.75rem;
  padding: 0.35rem 0.9rem 0.4rem 1.05rem;
  background: color-mix(in srgb, var(--tone-fill) 22%, var(--color-bg-soft));
  border-bottom: 1px solid color-mix(in srgb, var(--card-rarity) 35%, transparent);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.card-display__rarity-label,
.card-display__element {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.card-display__rarity-label {
  color: var(--tone);
}

.card-display__pips {
  display: inline-flex;
  gap: 0.18rem;
  font-size: 0.75rem;
  color: var(--tone-fill);
}

.card-display__element {
  padding: 0.12rem 0.45rem;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--tone-fill) 18%, var(--color-bg-card));
  color: var(--tone);
}

.card-display__element .dot {
  font-size: 0.75rem;
  color: var(--tone-fill);
}

.card-display__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.8rem 0.9rem 0.95rem 1.05rem;
}

.card-display__name {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.08;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.card-display__effect {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.1rem;
}

.card-display__label {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tone);
}

.card-display__desc {
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-ink);
}

.card-display__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.1rem;
  margin-top: 0.2rem;
}

.card-display__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
}

.card-display__stat-value {
  font-family: var(--font-display);
  font-size: 1.85rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.95;
}

.card-display__stat-meta {
  display: inline-flex;
  flex-direction: column;
  gap: 0.05rem;
}

.card-display__stat-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.card-display__stat-base {
  font-size: 0.625rem;
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
  margin: 0.15rem 0 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-ink-muted);
}

/* Bonus passif : bande distincte, typo plus discrète que l’effet actif */
.card-display__passive {
  margin-top: auto;
  padding: 0.7rem 0.9rem 0.85rem 1.05rem;
  border-top: 1px dashed var(--color-line-strong);
  background:
    repeating-linear-gradient(
      -12deg,
      transparent,
      transparent 6px,
      color-mix(in srgb, var(--color-indigo) 4%, transparent) 6px,
      color-mix(in srgb, var(--color-indigo) 4%, transparent) 7px
    ),
    var(--color-bg-soft);
}

.card-display__passive-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.card-display__passive-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.9rem;
  margin: 0.35rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-ink);
}

.card-display__passive-value {
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-indigo);
}

.card-display__passive-hint {
  margin-top: 0.3rem;
  font-size: 0.75rem;
  font-style: italic;
  line-height: 1.4;
  color: var(--color-ink-faint);
}

.card-display--compact .card-display__header {
  min-height: 2.35rem;
}

.card-display--compact .card-display__cost {
  min-width: 2.35rem;
  font-size: 1.4rem;
}

.card-display--compact .card-display__rarity-band {
  padding: 0.28rem 0.75rem 0.3rem 0.95rem;
}

.card-display--compact .card-display__body {
  gap: 0.35rem;
  padding: 0.6rem 0.75rem 0.7rem 0.95rem;
}

.card-display--compact .card-display__name {
  font-size: 1.0625rem;
}

.card-display--compact .card-display__stat-value {
  font-size: 1.4rem;
}

.card-display--compact .card-display__passive {
  padding: 0.5rem 0.75rem 0.6rem 0.95rem;
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
