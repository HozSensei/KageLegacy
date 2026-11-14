<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'CardDisplay' })

const props = defineProps({
  card: { type: Object, required: true },
  quantity: { type: Number, default: null },
  upgradeLevel: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

defineEmits(['select'])

const { t, locale } = useI18n()

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
</script>

<template>
  <button
    type="button"
    class="card-display"
    :class="[rarityClass, { 'card-display--selected': selected, 'card-display--compact': compact }]"
    data-testid="card-display"
    @click="$emit('select', card)"
  >
    <header class="card-display__header">
      <span class="card-display__cost">{{ card.cost ?? card.baseCost ?? 0 }}</span>
      <span class="card-display__type">{{ typeLabel }}</span>
      <span v-if="quantity != null" class="card-display__qty">×{{ quantity }}</span>
    </header>

    <h3 class="card-display__name">{{ name }}</h3>

    <p v-if="!compact" class="card-display__desc">{{ description }}</p>

    <div class="card-display__stats" v-if="card.damage || card.block || card.heal">
      <span v-if="card.damage" class="card-display__stat card-display__stat--dmg">
        {{ t('cards.damage', { n: card.damage }) }}
      </span>
      <span v-if="card.block" class="card-display__stat card-display__stat--blk">
        {{ t('cards.block', { n: card.block }) }}
      </span>
      <span v-if="card.heal" class="card-display__stat card-display__stat--heal">
        {{ t('cards.heal', { n: card.heal }) }}
      </span>
    </div>

    <div v-if="passiveEntries.length" class="card-display__passive" data-testid="card-passive">
      <p class="card-display__passive-label">{{ t('cards.passiveBonus') }}</p>
      <ul class="card-display__passive-list">
        <li v-for="entry in passiveEntries" :key="entry.key">
          <span class="text-accent">+{{ entry.value }}</span> {{ entry.label }}
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.12));
  background: linear-gradient(160deg, rgba(20, 24, 32, 0.95), rgba(12, 14, 20, 0.98));
  color: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.card-display:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 175, 55, 0.45);
}

.card-display--selected {
  border-color: var(--color-accent, #d4af37);
  box-shadow: inset 0 0 0 1px rgba(212, 175, 55, 0.35);
}

.card-display--common {
  border-left: 3px solid #8a9099;
}
.card-display--rare {
  border-left: 3px solid #4a8fd4;
}
.card-display--legendary {
  border-left: 3px solid #d4af37;
}
.card-display--mythic {
  border-left: 3px solid #a855f7;
}

.card-display__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink-muted, #9aa3b2);
}

.card-display__cost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border: 1px solid rgba(212, 175, 55, 0.5);
  color: var(--color-accent, #d4af37);
  font-weight: 600;
}

.card-display__qty {
  margin-left: auto;
  color: var(--color-ink, #e8ecf2);
}

.card-display__name {
  font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
  font-size: 1.15rem;
  line-height: 1.2;
  color: var(--color-ink, #e8ecf2);
}

.card-display__desc {
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--color-ink-muted, #9aa3b2);
}

.card-display__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.card-display__stat {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-display__stat--dmg {
  color: #e07a5f;
}
.card-display__stat--blk {
  color: #81b29a;
}
.card-display__stat--heal {
  color: #7eb8da;
}

.card-display__passive {
  margin-top: auto;
  padding-top: 0.55rem;
  border-top: 1px solid rgba(212, 175, 55, 0.25);
}

.card-display__passive-label {
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent, #d4af37);
  margin-bottom: 0.25rem;
}

.card-display__passive-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-ink, #e8ecf2);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.card-display__passive-hint {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: var(--color-ink-faint, #6b7380);
}

.card-display--compact .card-display__name {
  font-size: 1rem;
}
</style>
