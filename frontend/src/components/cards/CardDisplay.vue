<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardTypeVisual, elementLabelKey, elementTone, rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'CardDisplay' })

const props = defineProps({
  card: { type: Object, required: true },
  quantity: { type: Number, default: null },
  upgradeLevel: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

defineEmits(['select'])

const { t, te, locale } = useI18n()

const name = computed(() =>
  locale.value === 'en' ? props.card.nameEn : props.card.nameFr
)
const description = computed(() =>
  locale.value === 'en' ? props.card.descriptionEn : props.card.descriptionFr
)
const passiveDescription = computed(() =>
  locale.value === 'en'
    ? props.card.passiveDescriptionEn
    : props.card.passiveDescriptionFr
)

const rarityClass = computed(() => `card-display--${props.card.rarity || 'common'}`)

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
  const key = `cards.rarities.${props.card.rarity || 'common'}`
  return te(key) ? t(key) : props.card.rarity
})
const elementLabel = computed(() => {
  const key = elementLabelKey(props.card.element)
  if (!key) return ''
  return te(key) ? t(key) : props.card.element
})

const figures = computed(() =>
  [
    { key: 'damage', value: props.card.damage, label: t('cards.statDamage'), full: 'cards.damage' },
    { key: 'block', value: props.card.block, label: t('cards.statBlock'), full: 'cards.block' },
    { key: 'heal', value: props.card.heal, label: t('cards.statHeal'), full: 'cards.heal' },
  ].filter((entry) => entry.value)
)
</script>

<template>
  <button
    type="button"
    class="card-display"
    :class="[rarityClass, { 'card-display--selected': selected, 'card-display--compact': compact }]"
    :data-tone="typeVisual.tone"
    :aria-pressed="selected"
    data-testid="card-display"
    @click="$emit('select', card)"
  >
    <header class="card-display__header">
      <span class="card-display__cost" :title="t('cards.costLabel')">{{ card.cost ?? card.baseCost ?? 0 }}</span>
      <span class="card-display__type">
        <span class="shape" :class="`shape--${typeVisual.shape}`" aria-hidden="true" />
        {{ typeLabel }}
      </span>
      <span v-if="quantity != null" class="card-display__qty" :title="t('cards.quantityLabel')">×{{ quantity }}</span>
    </header>

    <div class="card-display__body">
      <h3 class="card-display__name">
        {{ name }}
        <span v-if="upgradeLevel > 0" class="card-display__upgrade" :title="t('cards.upgraded', { level: upgradeLevel })">
          +{{ upgradeLevel }}
        </span>
      </h3>

      <p class="card-display__meta">
        <span class="card-display__rarity" :data-tone="rarity.tone">
          <span class="card-display__pips" aria-hidden="true">
            <span v-for="n in rarity.pips" :key="n" class="lozenge" />
          </span>
          {{ rarityLabel }}
        </span>
        <span v-if="elementLabel" class="card-display__element" :data-tone="elementTone(card.element)">
          <span class="dot" aria-hidden="true" />
          {{ elementLabel }}
        </span>
      </p>

      <div class="card-display__effect">
        <p v-if="!compact" class="card-display__label">{{ t('cards.effect') }}</p>
        <p v-if="!compact" class="card-display__desc">{{ description }}</p>

        <div v-if="figures.length" class="card-display__stats">
          <span
            v-for="entry in figures"
            :key="entry.key"
            class="card-display__stat"
            :class="`card-display__stat--${entry.key}`"
            :aria-label="t(entry.full, { n: entry.value })"
          >
            <span class="card-display__stat-value" aria-hidden="true">{{ entry.value }}</span>
            <span class="card-display__stat-label" aria-hidden="true">{{ entry.label }}</span>
          </span>
        </div>
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
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-ink);
  text-align: left;
  outline: 0 solid var(--color-ink);
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    outline-width var(--dur-fast) ease;
}

.card-display:hover {
  transform: translateY(-4px);
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

/* Bandeau : couleur et forme du type, coût en grand */
.card-display__header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.75rem;
  padding: 0 0.85rem 0 0;
  background: var(--tone-fill);
  color: var(--tone-on);
}

.card-display__cost {
  display: grid;
  place-items: center;
  align-self: stretch;
  min-width: 2.75rem;
  padding: 0 0.5rem;
  background: var(--color-bg-card);
  font-family: var(--font-display);
  font-size: 1.75rem;
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
  gap: 0.45rem;
  min-width: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.card-display__qty {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
}

.card-display__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.85rem 0.9rem 0.95rem;
}

.card-display__name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.08;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.card-display__upgrade {
  display: inline-block;
  margin-left: 0.25rem;
  padding: 0 0.3rem;
  background: var(--color-ink);
  font-size: 0.75rem;
  font-stretch: 100%;
  line-height: 1.5;
  vertical-align: 0.2em;
  color: var(--color-on-ink);
}

.card-display__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.card-display__rarity,
.card-display__element {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.card-display__pips {
  display: inline-flex;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--tone-fill);
}

.card-display__element .dot {
  font-size: 0.8rem;
  color: var(--tone-fill);
}

.card-display__effect {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.2rem;
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
  gap: 0.25rem 1rem;
  margin-top: 0.15rem;
}

.card-display__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
}

.card-display__stat-value {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.95;
}

.card-display__stat-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
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

/* Bonus passif : même traitement sur toutes les cartes, distinct de l'effet */
.card-display__passive {
  padding: 0.7rem 0.9rem 0.8rem;
  background: var(--color-bg-soft);
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
  line-height: 1.4;
  color: var(--color-ink-faint);
}

.card-display--compact .card-display__header {
  min-height: 2.25rem;
}

.card-display--compact .card-display__cost {
  min-width: 2.25rem;
  font-size: 1.375rem;
}

.card-display--compact .card-display__body {
  gap: 0.4rem;
  padding: 0.65rem 0.75rem 0.7rem;
}

.card-display--compact .card-display__name {
  font-size: 1.0625rem;
}

.card-display--compact .card-display__stat-value {
  font-size: 1.375rem;
}

.card-display--compact .card-display__passive {
  padding: 0.5rem 0.75rem 0.6rem;
}
</style>
