<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CardDisplay from './CardDisplay.vue'
import { cardTypeVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'DeckBuilder' })

const props = defineProps({
  deck: { type: Object, default: null },
  collection: { type: Array, default: () => [] },
  constraints: { type: Object, default: () => ({ min: 20, max: 30 }) },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['add', 'remove', 'activate'])

const { t, locale } = useI18n()

const size = computed(() => props.deck?.size ?? 0)
const validation = computed(() => props.deck?.validation)
const passiveBonuses = computed(() => props.deck?.passiveBonuses || {})

const passiveList = computed(() =>
  Object.entries(passiveBonuses.value)
    .filter(([, v]) => Number(v) !== 0)
    .map(([key, value]) => ({
      key,
      value: Number(value),
      label: t(`cards.stats.${key}`, key),
    }))
)

const deckCollectionIds = computed(() => {
  const map = new Map()
  for (const c of props.deck?.cards || []) {
    map.set(c.collectionId, c.quantity)
  }
  return map
})

function inDeckQty(collectionId) {
  return deckCollectionIds.value.get(collectionId) || 0
}

function canAdd(entry) {
  const inDeck = inDeckQty(entry.collectionId)
  return inDeck < 3 && inDeck < entry.quantity && size.value < props.constraints.max
}

function cardName(card) {
  return locale.value === 'en' ? card.nameEn : card.nameFr
}

const sizeRatio = computed(() => {
  const max = Number(props.constraints.max) || 1
  return Math.min(100, Math.round((size.value / max) * 100))
})
const minRatio = computed(() => {
  const max = Number(props.constraints.max) || 1
  return Math.min(100, Math.round((Number(props.constraints.min) / max) * 100))
})
const sizeValid = computed(
  () => size.value >= props.constraints.min && size.value <= props.constraints.max
)
</script>

<template>
  <div class="deck-builder" data-testid="deck-builder">
    <div v-if="!deck" class="alert">{{ t('cards.selectOrCreateDeck') }}</div>

    <template v-else>
      <header class="deck-builder__header">
        <div class="min-w-0">
          <p class="t-kicker flex items-center gap-2">
            <span v-if="deck.isActive" class="badge badge--solid" data-tone="leaf">{{ t('cards.activeDeck') }}</span>
            <span class="sr-only">
              {{ t('cards.deckSize', { size, min: constraints.min, max: constraints.max }) }}
            </span>
          </p>
          <h2 class="deck-builder__name">{{ deck.name }}</h2>
        </div>

        <div class="deck-builder__size" :data-tone="sizeValid ? 'leaf' : 'vermilion'" aria-hidden="true">
          <p class="figure figure--lg">
            {{ size }}<span class="figure__max"> / {{ constraints.max }}</span>
          </p>
          <div class="deck-builder__meter meter">
            <span class="meter__fill" :style="{ width: `${sizeRatio}%` }" />
            <span class="deck-builder__min" :style="{ left: `${minRatio}%` }" />
          </div>
          <p class="deck-builder__range">{{ constraints.min }}–{{ constraints.max }}</p>
        </div>

        <button
          v-if="!deck.isActive"
          type="button"
          class="btn-primary"
          :disabled="busy"
          @click="emit('activate', deck.id)"
        >
          {{ t('cards.activateDeck') }}
        </button>
      </header>

      <p
        v-if="validation && !validation.valid"
        class="alert alert--error mt-4"
        data-testid="deck-validation"
      >
        {{ validation.errors.join(' ') }}
      </p>

      <section v-if="passiveList.length" class="deck-builder__passives">
        <h3 class="t-kicker flex items-center gap-2">
          <span class="lozenge lozenge--hollow" aria-hidden="true" />
          {{ t('cards.deckPassives') }}
        </h3>
        <ul class="deck-builder__passive-list">
          <li v-for="entry in passiveList" :key="entry.key">
            <span class="figure figure--sm">+{{ entry.value }}</span>
            <span class="deck-builder__passive-label">{{ entry.label }}</span>
          </li>
        </ul>
      </section>

      <div class="deck-builder__panels">
        <section>
          <div class="section-head">
            <span class="section-head__index">A</span>
            <h3 class="section-head__title">{{ t('cards.inDeck') }}</h3>
            <span class="section-head__rule" />
          </div>
          <p v-if="!deck.cards?.length" class="mt-4 text-ink-muted">{{ t('cards.deckEmpty') }}</p>
          <TransitionGroup v-else tag="ul" name="deck-row" class="deck-builder__rows">
            <li
              v-for="entry in deck.cards"
              :key="entry.deckCardId"
              class="deck-row"
              :data-tone="cardTypeVisual(entry.card?.type).tone"
            >
              <span class="deck-row__cost">{{ entry.card?.cost ?? entry.card?.baseCost ?? 0 }}</span>
              <div class="min-w-0 flex-1">
                <p class="deck-row__name">{{ cardName(entry.card) }}</p>
                <p class="deck-row__type">
                  <span
                    class="shape"
                    :class="`shape--${cardTypeVisual(entry.card?.type).shape}`"
                    aria-hidden="true"
                  />
                  {{ t(`cards.types.${entry.card?.type}`, entry.card?.type || '') }}
                </p>
              </div>
              <span class="deck-row__qty">×{{ entry.quantity }}</span>
              <button
                type="button"
                class="btn-ghost btn-sm"
                :disabled="busy"
                @click="emit('remove', entry.collectionId)"
              >
                {{ t('cards.remove') }}
              </button>
            </li>
          </TransitionGroup>
        </section>

        <section>
          <div class="section-head">
            <span class="section-head__index">B</span>
            <h3 class="section-head__title">{{ t('cards.fromCollection') }}</h3>
            <span class="section-head__rule" />
          </div>
          <div class="deck-builder__pool">
            <div v-for="entry in collection" :key="entry.collectionId" class="deck-builder__pool-item">
              <CardDisplay
                :card="entry.card"
                :quantity="entry.quantity"
                :upgrade-level="entry.upgradeLevel"
                compact
              />
              <button
                type="button"
                class="btn-secondary btn-sm btn-block"
                :disabled="busy || !canAdd(entry)"
                @click="emit('add', entry.collectionId)"
              >
                {{ t('cards.addToDeck') }}
                <span v-if="inDeckQty(entry.collectionId)" class="deck-builder__in-deck">
                  {{ inDeckQty(entry.collectionId) }}
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.deck-builder__header {
  display: grid;
  gap: 1.25rem;
  align-items: end;
}

.deck-builder__name {
  margin-top: 0.5rem;
  font-size: clamp(1.75rem, 1.3rem + 2vw, 2.75rem);
  font-weight: 800;
  font-stretch: 80%;
  line-height: 0.98;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.deck-builder__size {
  min-width: 11rem;
}

.deck-builder__size .figure {
  color: var(--tone);
}

.deck-builder__meter {
  margin-top: 0.6rem;
  overflow: visible;
}

.deck-builder__min {
  position: absolute;
  top: -0.25rem;
  bottom: -0.25rem;
  width: 2px;
  background: var(--color-ink);
}

.deck-builder__range {
  margin-top: 0.4rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-faint);
}

.deck-builder__passives {
  margin-top: 1.75rem;
  padding: 1rem 1.1rem 1.1rem;
  background: var(--color-bg-soft);
}

.deck-builder__passive-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
  margin: 0.85rem 0 0;
  padding: 0;
  list-style: none;
}

.deck-builder__passive-list li {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.deck-builder__passive-list .figure {
  color: var(--color-indigo);
}

.deck-builder__passive-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.deck-builder__panels {
  display: grid;
  gap: 2.5rem;
  margin-top: var(--space-block);
}

.deck-builder__rows {
  position: relative;
  margin: 1.1rem 0 0;
  padding: 0;
  list-style: none;
}

.deck-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-line);
}

.deck-row__cost {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  background: var(--tone-fill);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 76%;
  color: var(--tone-on);
}

.deck-row__name {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deck-row__type {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tone);
}

.deck-row__qty {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
}

.deck-row-enter-active {
  transition:
    opacity var(--dur-base) ease,
    transform var(--dur-base) var(--ease-out-quint),
    background-color 900ms ease;
}

.deck-row-leave-active {
  position: absolute;
  width: 100%;
  transition:
    opacity var(--dur-fast) ease,
    transform var(--dur-fast) ease;
}

.deck-row-move {
  transition: transform var(--dur-base) var(--ease-out-quint);
}

.deck-row-enter-from {
  opacity: 0;
  background-color: var(--tone-tint);
  transform: translateX(-14px);
}

.deck-row-leave-to {
  opacity: 0;
  transform: translateX(14px);
}

.deck-builder__pool {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr));
  gap: 1rem 0.85rem;
  margin-top: 1.1rem;
}

.deck-builder__pool-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.deck-builder__pool-item > :first-child {
  flex: 1;
}

.deck-builder__in-deck {
  display: inline-grid;
  place-items: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--color-on-fill);
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-indigo-deep);
}

@media (min-width: 768px) {
  .deck-builder__header {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 2rem;
  }
}

@media (min-width: 1024px) {
  .deck-builder__panels {
    grid-template-columns: minmax(16rem, 0.8fr) minmax(0, 1.4fr);
    gap: 3rem;
  }
}
</style>
