<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from './CardDisplay.vue';
import CardHole from './CardHole.vue';
import CardFilters from './CardFilters.vue';
import { useCardSizePreference } from '../../composables/useCardSizePreference.js';
import { cardMatchesArt } from '../../utils/cardBonusChips';
import { slotMatchesOwnershipFilter } from '../../utils/cardOwnershipFilter.js';

defineOptions({ name: 'CollectionGrid' });

const { cardSize } = useCardSizePreference();

const props = defineProps({
  /** Slots catalogue : { kind, key, card, entry } */
  slots: { type: Array, default: () => [] },
  selectedKey: { type: String, default: null },
  loading: { type: Boolean, default: false },
  ownershipFilter: { type: String, default: '' },
  initialSearch: { type: String, default: '' },
  /** cardDefinitionId présents dans le deck actif */
  activeDeckCardIds: { type: Object, default: () => new Set() },
  /** cardDefinitionId présents dans au moins un deck */
  anyDeckCardIds: { type: Object, default: () => new Set() },
});

const emit = defineEmits(['select', 'update:ownershipFilter']);

const { t } = useI18n();

const typeFilter = ref('');
const rarityFilter = ref('');
const artFilter = ref('');
const search = ref(props.initialSearch);
/** @type {Map<string, HTMLElement>} */
const cellEls = new Map();

watch(
  () => props.initialSearch,
  value => {
    search.value = value;
  }
);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.slots.filter(slot => {
    if (
      !slotMatchesOwnershipFilter(
        slot,
        props.ownershipFilter,
        props.activeDeckCardIds,
        props.anyDeckCardIds
      )
    ) {
      return false;
    }
    const card = slot.card;
    if (!card) return false;
    if (typeFilter.value && card.type !== typeFilter.value) return false;
    if (rarityFilter.value && card.rarity !== rarityFilter.value) return false;
    if (!cardMatchesArt(card, artFilter.value)) return false;
    if (q) {
      const fr = String(card.nameFr || '').toLowerCase();
      const en = String(card.nameEn || '').toLowerCase();
      const slug = String(card.slug || '').toLowerCase();
      if (!fr.includes(q) && !en.includes(q) && !slug.includes(q)) return false;
    }
    return true;
  });
});

function setCellRef(key, el) {
  if (el) cellEls.set(key, el);
  else cellEls.delete(key);
}

function onSelectSlot(slot) {
  emit('select', { slot, anchorEl: cellEls.get(slot.key) || null });
}
</script>

<template>
  <div class="collection-grid" data-testid="collection-grid">
    <CardFilters
      v-model:type-filter="typeFilter"
      v-model:rarity-filter="rarityFilter"
      v-model:art-filter="artFilter"
      v-model:search="search"
      :ownership-filter="ownershipFilter"
      show-ownership-filter
      :result-count="filtered.length"
      :total-count="slots.length"
      search-test-id="collection-search"
      @update:ownership-filter="emit('update:ownershipFilter', $event)"
    />

    <p v-if="loading" class="text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="!filtered.length" class="alert" data-testid="collection-empty-filter">
      {{ ownershipFilter ? t('cards.emptyOwnedFilter') : t('cards.emptyFilter') }}
    </p>

    <div
      v-else
      class="collection-grid__list stagger"
      :class="{ 'collection-grid__list--large': cardSize === 'large' }"
      :data-card-size="cardSize"
    >
      <div
        v-for="slot in filtered"
        :key="slot.key"
        :ref="el => setCellRef(slot.key, el)"
        class="collection-grid__cell"
      >
        <CardDisplay
          v-if="slot.kind === 'owned'"
          :card="slot.card"
          :quantity="slot.entry.quantity"
          :upgrade-level="slot.entry.upgradeLevel"
          :catalogue-number="slot.catalogueNumber"
          :selected="selectedKey === slot.key"
          :size="cardSize"
          @select="onSelectSlot(slot)"
        />
        <CardHole
          v-else
          :catalogue-number="slot.catalogueNumber"
          :selected="selectedKey === slot.key"
          @select="onSelectSlot(slot)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection-grid__list {
  display: grid;
  /* Mobile: force 2 columns like the deck builder pool */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.1rem 0.75rem;
  align-items: start;
  /* Room for overflowing cost diamond */
  padding: 0.45rem 0.45rem 0.2rem 0;
}

@media (min-width: 640px) {
  .collection-grid__list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.35rem 1.15rem;
  }

  .collection-grid__list--large {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem 1.35rem;
  }
}

/* Pleine largeur (plus de rail détail) → 4 colonnes desktop */
@media (min-width: 1024px) {
  .collection-grid__list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem 1.25rem;
  }

  .collection-grid__list--large {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.6rem 1.35rem;
  }
}
</style>
