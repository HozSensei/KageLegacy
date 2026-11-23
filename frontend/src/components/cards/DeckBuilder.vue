<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from './CardDisplay.vue';
import CardFilters from './CardFilters.vue';
import { useCardSizePreference } from '../../composables/useCardSizePreference.js';
import { cardMatchesArt } from '../../utils/cardBonusChips';

defineOptions({ name: 'DeckBuilder' });

const { cardSize } = useCardSizePreference();

const props = defineProps({
  deck: { type: Object, default: null },
  collection: { type: Array, default: () => [] },
  constraints: {
    type: Object,
    default: () => ({
      min: 20,
      max: 30,
      maxCopies: 3,
      maxClan: 1,
      maxLegendaryOrMythic: 3,
      minPrimaryArtCards: 15,
      minSecondaryArtCards: 5,
    }),
  },
  busy: { type: Boolean, default: false },
  feedback: { type: Object, default: null },
});

const emit = defineEmits(['add', 'remove', 'activate']);

const { t, locale } = useI18n();
const recapOpen = ref(false);
const typeFilter = ref('');
const rarityFilter = ref('');
const artFilter = ref('');
const search = ref('');

const filteredCollection = computed(() => {
  const query = search.value.trim().toLowerCase();
  return props.collection.filter(({ card }) => {
    if (!card) return false;
    if (typeFilter.value && card.type !== typeFilter.value) return false;
    if (rarityFilter.value && card.rarity !== rarityFilter.value) return false;
    if (!cardMatchesArt(card, artFilter.value)) return false;
    return (
      !query ||
      [card.nameFr, card.nameEn, card.slug].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      )
    );
  });
});

const size = computed(() => props.deck?.size ?? 0);
const validation = computed(() => props.deck?.validation);
const artSummary = computed(() => {
  const result = validation.value;
  if (!result?.artCounts || !Number.isInteger(result.nonNeutralCount)) return null;
  const minPrimary =
    result.minPrimaryArtCards ?? props.constraints.minPrimaryArtCards ?? 15;
  const minSecondary =
    result.minSecondaryArtCards ?? props.constraints.minSecondaryArtCards ?? 5;
  const primaryArt = result.primaryArt;
  const secondaryArt = result.secondaryArt;
  const primaryLabel = primaryArt ? t(`cards.stats.${primaryArt}`) : '—';
  const secondaryLabel = secondaryArt ? t(`cards.stats.${secondaryArt}`) : '—';
  return {
    neutral: size.value - result.nonNeutralCount,
    nonNeutral: result.nonNeutralCount,
    minPrimary,
    minSecondary,
    primaryArt,
    secondaryArt,
    primaryCount: result.primaryCount ?? 0,
    secondaryCount: result.secondaryCount ?? 0,
    primaryLabel,
    secondaryLabel,
    arts: Object.entries(result.artCounts).filter(([, count]) => count > 0),
  };
});

function artBadgeTone(art, count) {
  const summary = artSummary.value;
  if (!summary) return 'neutral';
  if (art === summary.primaryArt && count < summary.minPrimary) return 'vermilion';
  if (art === summary.secondaryArt && count < summary.minSecondary) return 'vermilion';
  if (
    summary.primaryCount < summary.minPrimary &&
    art !== summary.primaryArt &&
    art !== summary.secondaryArt
  ) {
    return 'neutral';
  }
  return 'neutral';
}
const validity = computed(() => {
  if (validation.value?.valid === true) return 'valid';
  if (validation.value?.valid === false) return 'invalid';
  return 'unknown';
});
const passiveBonuses = computed(() => props.deck?.passiveBonuses || {});

const maxCopies = computed(() => Number(props.constraints.maxCopies) || 3);
const maxClan = computed(() => Number(props.constraints.maxClan) || 1);
const maxLegendaryOrMythic = computed(() => Number(props.constraints.maxLegendaryOrMythic) || 3);

function isClanCard(card) {
  if (!card) return false;
  if (typeof card.slug === 'string' && card.slug.startsWith('clan-')) return true;
  if (card.clan === true || card.clan === 1 || card.clan === 'clan') return true;
  if (Array.isArray(card.tags) && card.tags.map(String).includes('clan')) return true;
  return false;
}

function isLegendaryOrMythic(card) {
  return card?.rarity === 'legendary' || card?.rarity === 'mythic';
}

const clanCount = computed(() =>
  (props.deck?.cards || []).reduce((sum, entry) => {
    const qty = Number(entry.quantity) || 0;
    return isClanCard(entry.card) ? sum + qty : sum;
  }, 0)
);

const legendaryOrMythicCount = computed(() =>
  (props.deck?.cards || []).reduce((sum, entry) => {
    const qty = Number(entry.quantity) || 0;
    return isLegendaryOrMythic(entry.card) ? sum + qty : sum;
  }, 0)
);

const validationMessages = computed(() => {
  const v = validation.value;
  if (!v || v.valid) return [];
  if (locale.value === 'en' && Array.isArray(v.errorsEn) && v.errorsEn.length) {
    return v.errorsEn;
  }
  if (Array.isArray(v.errors) && v.errors.length) return v.errors;
  return [];
});

const passiveList = computed(() =>
  Object.entries(passiveBonuses.value)
    .filter(([, v]) => Number(v) !== 0)
    .map(([key, value]) => ({
      key,
      value: Number(value),
      label: t(`cards.stats.${key}`, key),
    }))
);

const deckCollectionIds = computed(() => {
  const map = new Map();
  for (const c of props.deck?.cards || []) {
    map.set(c.collectionId, Number(c.quantity) || 0);
  }
  return map;
});

function inDeckQty(collectionId) {
  return deckCollectionIds.value.get(collectionId) || 0;
}

function addEntry(entry) {
  if (!props.busy && canAdd(entry)) emit('add', entry.collectionId);
}

function canAdd(entry) {
  const inDeck = inDeckQty(entry.collectionId);
  if (inDeck >= maxCopies.value || inDeck >= entry.quantity) return false;
  if (size.value >= props.constraints.max) return false;

  const card = entry.card;
  if (isClanCard(card) && clanCount.value >= maxClan.value) return false;
  if (isLegendaryOrMythic(card) && legendaryOrMythicCount.value >= maxLegendaryOrMythic.value) {
    return false;
  }
  return true;
}

function cardName(card) {
  return locale.value === 'en' ? card.nameEn : card.nameFr;
}

const sizeRatio = computed(() => {
  const max = Number(props.constraints.max) || 1;
  return Math.min(100, Math.round((size.value / max) * 100));
});
const minRatio = computed(() => {
  const max = Number(props.constraints.max) || 1;
  return Math.min(100, Math.round((Number(props.constraints.min) / max) * 100));
});
const sizeValid = computed(
  () => size.value >= props.constraints.min && size.value <= props.constraints.max
);
</script>

<template>
  <div class="deck-builder" data-testid="deck-builder">
    <div v-if="!deck" class="alert">{{ t('cards.selectOrCreateDeck') }}</div>

    <template v-else>
      <header class="deck-builder__header">
        <div class="min-w-0">
          <p class="t-kicker flex items-center gap-2">
            <span v-if="deck.isActive" class="badge badge--solid" data-tone="leaf">{{
              t('cards.activeDeck')
            }}</span>
            <span class="sr-only">
              {{ t('cards.deckSize', { size, min: constraints.min, max: constraints.max }) }}
            </span>
          </p>
          <h2 class="deck-builder__name">{{ deck.name }}</h2>
          <p
            class="badge badge--solid mt-2"
            :data-tone="
              validity === 'valid' ? 'leaf' : validity === 'invalid' ? 'vermilion' : 'neutral'
            "
            data-testid="deck-validity"
            role="status"
          >
            {{ t(`cards.deckValidity.${validity}`) }}
          </p>
        </div>

        <div
          class="deck-builder__size"
          :data-tone="sizeValid ? 'leaf' : 'vermilion'"
          aria-hidden="true"
        >
          <p class="figure figure--lg">
            {{ size }}<span class="figure__max"> / {{ constraints.max }}</span>
          </p>
          <div class="deck-builder__meter meter">
            <span class="meter__fill" :style="{ width: `${sizeRatio}%` }" />
            <span class="deck-builder__min" :style="{ left: `${minRatio}%` }" />
          </div>
          <p class="deck-builder__range">{{ constraints.min }}–{{ constraints.max }}</p>
          <p class="deck-builder__limits">
            {{
              t('cards.deckRarityLimits', {
                maxClan,
                clanCount,
                maxLegendary: maxLegendaryOrMythic,
                legendaryCount: legendaryOrMythicCount,
              })
            }}
          </p>
        </div>

        <div v-if="!deck.isActive || feedback?.target === 'activate'">
          <button
            v-if="!deck.isActive"
            type="button"
            class="btn-primary"
            :disabled="busy || validity !== 'valid'"
            @click="emit('activate', deck.id)"
          >
            {{ t('cards.activateDeck') }}
          </button>
          <p
            v-if="feedback?.target === 'activate'"
            class="alert mt-2"
            :class="`alert--${feedback.type}`"
            :role="feedback.type === 'error' ? 'alert' : 'status'"
          >
            {{ feedback.text }}
          </p>
        </div>
      </header>

      <section v-if="artSummary" class="mt-4" data-testid="deck-art-summary">
        <h3 class="t-kicker">{{ t('cards.deckArts.title') }}</h3>
        <p class="text-ink-muted">{{ t('cards.deckArts.summary', artSummary) }}</p>
        <ul v-if="artSummary.arts.length" class="chip-row mt-2">
          <li
            v-for="[art, count] in artSummary.arts"
            :key="art"
            class="badge"
            :data-tone="artBadgeTone(art, count)"
          >
            {{ t(`cards.stats.${art}`) }} : {{ count
            }}<template v-if="art === artSummary.primaryArt">
              /{{ artSummary.minPrimary }}</template
            ><template v-else-if="art === artSummary.secondaryArt">
              /{{ artSummary.minSecondary }}</template
            >
          </li>
        </ul>
      </section>

      <div
        v-if="validity === 'invalid'"
        class="alert alert--error mt-4"
        data-testid="deck-validation"
        aria-live="polite"
      >
        <p>{{ t('cards.deckValidity.fix') }}</p>
        <ul v-if="validationMessages.length" class="deck-builder__issues">
          <li v-for="reason in validationMessages" :key="reason">{{ reason }}</li>
        </ul>
      </div>

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

      <section class="deck-builder__recap">
        <button
          type="button"
          class="btn-secondary"
          data-testid="deck-recap-toggle"
          :aria-expanded="recapOpen"
          @click="recapOpen = !recapOpen"
        >
          {{ t(recapOpen ? 'cards.hideDeckRecap' : 'cards.deckRecap') }}
        </button>
        <div v-if="recapOpen" class="deck-builder__recap-content" data-testid="deck-recap">
          <h3 class="t-kicker">{{ t('cards.deckRecapTitle') }}</h3>
          <p v-if="!deck.cards?.length" class="mt-3 text-ink-muted">{{ t('cards.deckEmpty') }}</p>
          <ul v-else class="deck-builder__recap-list">
            <li v-for="entry in deck.cards" :key="entry.deckCardId">
              <span>{{ cardName(entry.card) }}</span>
              <span class="deck-builder__recap-type">
                {{ t(`cards.types.${entry.card?.type}`, entry.card?.type || '') }}
              </span>
              <span class="deck-builder__recap-qty">×{{ entry.quantity }}</span>
            </li>
          </ul>
        </div>
      </section>

      <section class="deck-builder__collection">
        <div class="section-head">
          <span class="section-head__index">A</span>
          <h3 class="section-head__title">{{ t('cards.deckCardPool') }}</h3>
          <span class="section-head__rule" />
        </div>
        <CardFilters
          v-model:type-filter="typeFilter"
          v-model:rarity-filter="rarityFilter"
          v-model:art-filter="artFilter"
          v-model:search="search"
          :result-count="filteredCollection.length"
          :total-count="collection.length"
          search-test-id="deck-search"
        />
        <p v-if="!filteredCollection.length" class="alert">{{ t('cards.emptyFilter') }}</p>
        <div
          class="deck-builder__pool"
          :class="{ 'deck-builder__pool--large': cardSize === 'large' }"
          :data-card-size="cardSize"
        >
          <div
            v-for="entry in filteredCollection"
            :key="entry.collectionId"
            class="deck-builder__pool-item"
            :class="{ 'deck-builder__pool-item--in-deck': inDeckQty(entry.collectionId) > 0 }"
            :data-testid="`deck-card-${entry.collectionId}`"
          >
            <CardDisplay
              :card="entry.card"
              :quantity="entry.quantity"
              :upgrade-level="entry.upgradeLevel"
              :selected="inDeckQty(entry.collectionId) > 0"
              :size="cardSize"
              compact
              @select="addEntry(entry)"
            />
            <div
              class="deck-builder__quantity"
              :data-tone="inDeckQty(entry.collectionId) ? 'leaf' : 'neutral'"
            >
              <button
                type="button"
                class="deck-builder__quantity-button"
                :aria-label="t('cards.removeOneFromDeck', { name: cardName(entry.card) })"
                :disabled="busy || inDeckQty(entry.collectionId) < 1"
                @click="emit('remove', entry.collectionId)"
              >
                −
              </button>
              <span
                class="deck-builder__quantity-value"
                :aria-label="t('cards.cardsInDeck', inDeckQty(entry.collectionId))"
              >
                {{ inDeckQty(entry.collectionId) }}
              </span>
              <button
                type="button"
                class="deck-builder__quantity-button"
                :aria-label="t('cards.addOneToDeck', { name: cardName(entry.card) })"
                :disabled="busy || !canAdd(entry)"
                @click="emit('add', entry.collectionId)"
              >
                +
              </button>
            </div>
            <p
              v-if="feedback?.target === `card-${entry.collectionId}`"
              class="alert deck-builder__card-feedback"
              :class="`alert--${feedback.type}`"
              :role="feedback.type === 'error' ? 'alert' : 'status'"
              :data-testid="`deck-card-feedback-${entry.collectionId}`"
            >
              {{ feedback.text }}
            </p>
          </div>
        </div>
      </section>
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

.deck-builder__limits {
  margin-top: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
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

.deck-builder__recap {
  margin-top: 1.5rem;
}

.deck-builder__recap-content {
  margin-top: 0.75rem;
  padding: 1rem 1.1rem;
  background: var(--color-bg-soft);
}

.deck-builder__recap-list {
  display: grid;
  gap: 0.45rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

.deck-builder__recap-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: baseline;
  gap: 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--color-line);
}

.deck-builder__recap-type {
  font-size: 0.75rem;
  color: var(--color-ink-muted);
}

.deck-builder__recap-qty {
  min-width: 2rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.deck-builder__collection {
  margin-top: var(--space-block);
}

.deck-builder__pool {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
  gap: 1rem 0.85rem;
  margin-top: 1.1rem;
}

@media (min-width: 640px) {
  .deck-builder__pool--large {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
    gap: 1.15rem 1rem;
  }
}

.deck-builder__pool-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.deck-builder__pool-item:not(.deck-builder__pool-item--in-deck) > :first-child {
  opacity: 0.55;
}

.deck-builder__issues {
  margin: 0.4rem 0 0;
  padding-inline-start: 1.25rem;
  list-style: disc;
}

.deck-builder__card-feedback {
  padding: 0.5rem;
  overflow-wrap: anywhere;
}

.deck-builder__pool-item > :first-child {
  flex: 1;
}

.deck-builder__quantity {
  display: grid;
  grid-template-columns: 2.5rem minmax(2rem, 1fr) 2.5rem;
  align-items: center;
  justify-items: center;
  min-height: 2.5rem;
  border: 1px solid var(--color-line);
  background: var(--color-bg-soft);
}

.deck-builder__quantity-button {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 2.5rem;
  border: 0;
  background: transparent;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color var(--dur-fast) ease;
}

.deck-builder__quantity-button:hover:not(:disabled) {
  background: var(--color-bg);
}

.deck-builder__quantity-button:disabled {
  color: var(--color-ink-faint);
  cursor: not-allowed;
}

.deck-builder__quantity-value {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--tone);
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
