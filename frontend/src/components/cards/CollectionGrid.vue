<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from './CardDisplay.vue';
import CardHole from './CardHole.vue';
import CardFilters from './CardFilters.vue';
import { cardMatchesArt } from '../../utils/cardBonusChips';

defineOptions({ name: 'CollectionGrid' });

const props = defineProps({
  /** Slots catalogue : { kind, key, card, entry } */
  slots: { type: Array, default: () => [] },
  selectedKey: { type: String, default: null },
  loading: { type: Boolean, default: false },
  ownedOnly: { type: Boolean, default: false },
  ownedCount: { type: Number, default: 0 },
  catalogueTotal: { type: Number, default: 0 },
});

const emit = defineEmits(['select', 'update:ownedOnly']);

const { t } = useI18n();

const typeFilter = ref('');
const rarityFilter = ref('');
const artFilter = ref('');
const search = ref('');

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.slots.filter(slot => {
    if (props.ownedOnly && slot.kind !== 'owned') return false;
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

function onOwnedOnlyChange(event) {
  emit('update:ownedOnly', event.target.checked);
}

function onSelectSlot(slot) {
  emit('select', slot);
}
</script>

<template>
  <div class="collection-grid" data-testid="collection-grid">
    <div class="collection-grid__toolbar">
      <p class="collection-grid__count" data-testid="collection-count">
        {{ t('cards.collectionProgress', { owned: ownedCount, total: catalogueTotal }) }}
      </p>
      <label class="collection-grid__owned-only">
        <input
          type="checkbox"
          data-testid="collection-owned-only"
          :checked="ownedOnly"
          @change="onOwnedOnlyChange"
        />
        <span>{{ t('cards.showOwnedOnly') }}</span>
      </label>
    </div>

    <CardFilters
      v-model:type-filter="typeFilter"
      v-model:rarity-filter="rarityFilter"
      v-model:art-filter="artFilter"
      v-model:search="search"
      :result-count="filtered.length"
      :total-count="slots.length"
      search-test-id="collection-search"
    />

    <p v-if="loading" class="text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="!filtered.length" class="alert" data-testid="collection-empty-filter">
      {{ ownedOnly ? t('cards.emptyOwnedFilter') : t('cards.emptyFilter') }}
    </p>

    <div v-else class="collection-grid__list stagger">
      <template v-for="slot in filtered" :key="slot.key">
        <CardDisplay
          v-if="slot.kind === 'owned'"
          :card="slot.card"
          :quantity="slot.entry.quantity"
          :upgrade-level="slot.entry.upgradeLevel"
          :catalogue-number="slot.catalogueNumber"
          :selected="selectedKey === slot.key"
          @select="onSelectSlot(slot)"
        />
        <CardHole
          v-else
          :catalogue-number="slot.catalogueNumber"
          :selected="selectedKey === slot.key"
          @select="onSelectSlot(slot)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.collection-grid__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  margin-bottom: 1.25rem;
}

.collection-grid__count {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}

.collection-grid__owned-only {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-ink);
  cursor: pointer;
  user-select: none;
}

.collection-grid__owned-only input {
  width: 1.05rem;
  height: 1.05rem;
  accent-color: var(--color-vermilion);
  cursor: pointer;
}

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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr));
    gap: 1.35rem 1.15rem;
  }
}
</style>
