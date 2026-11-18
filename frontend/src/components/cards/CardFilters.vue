<script setup>
import { useI18n } from 'vue-i18n';
import { cardTypeVisual, rarityVisual } from '../../utils/cardVisuals';

defineProps({
  typeFilter: { type: String, default: '' },
  rarityFilter: { type: String, default: '' },
  artFilter: { type: String, default: '' },
  search: { type: String, default: '' },
  resultCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  searchTestId: { type: String, default: 'card-filter-search' },
});

const emit = defineEmits([
  'update:typeFilter',
  'update:rarityFilter',
  'update:artFilter',
  'update:search',
]);

const { t } = useI18n();

const types = ['', 'attack', 'defense', 'skill', 'item', 'summon'];
const rarities = ['', 'common', 'rare', 'legendary', 'mythic'];
const arts = ['', 'taijutsu', 'ninjutsu', 'genjutsu', 'medicine', 'common'];
</script>

<template>
  <div class="card-filters">
    <p class="card-filters__count" data-testid="card-filter-count" aria-live="polite">
      {{ t('cards.filterResults', { count: resultCount, total: totalCount }) }}
    </p>

    <div class="card-filters__filter" role="group" :aria-label="t('cards.filterType')">
      <span class="t-kicker">{{ t('cards.filterType') }}</span>
      <div class="chip-row">
        <button
          v-for="type in types"
          :key="type || 'all'"
          type="button"
          class="chip"
          :aria-pressed="typeFilter === type"
          :data-tone="type ? cardTypeVisual(type).tone : 'neutral'"
          @click="emit('update:typeFilter', type)"
        >
          <span
            v-if="type"
            class="shape chip__mark"
            :class="`shape--${cardTypeVisual(type).shape}`"
            aria-hidden="true"
          />
          {{ type ? t(`cards.types.${type}`) : t('cards.filterAll') }}
        </button>
      </div>
    </div>

    <div class="card-filters__filter" role="group" :aria-label="t('cards.filterRarity')">
      <span class="t-kicker">{{ t('cards.filterRarity') }}</span>
      <div class="chip-row">
        <button
          v-for="rarity in rarities"
          :key="rarity || 'all'"
          type="button"
          class="chip"
          :aria-pressed="rarityFilter === rarity"
          :data-tone="rarity ? rarityVisual(rarity).tone : 'neutral'"
          @click="emit('update:rarityFilter', rarity)"
        >
          <span v-if="rarity" class="card-filters__pips chip__mark" aria-hidden="true">
            <span v-for="n in rarityVisual(rarity).pips" :key="n" class="lozenge" />
          </span>
          {{ rarity ? t(`cards.rarities.${rarity}`) : t('cards.filterAll') }}
        </button>
      </div>
    </div>

    <div class="card-filters__filter" role="group" :aria-label="t('cards.filterArt')">
      <span class="t-kicker">{{ t('cards.filterArt') }}</span>
      <div class="chip-row">
        <button
          v-for="art in arts"
          :key="art || 'all'"
          type="button"
          class="chip"
          :aria-pressed="artFilter === art"
          @click="emit('update:artFilter', art)"
        >
          {{ art ? t(`cards.stats.${art}`) : t('cards.filterAll') }}
        </button>
      </div>
    </div>

    <label class="card-filters__search">
      <span class="t-kicker">{{ t('cards.filterSearch') }}</span>
      <input
        :value="search"
        type="search"
        class="card-filters__search-input"
        :data-testid="searchTestId"
        :placeholder="t('cards.filterSearchPlaceholder')"
        @input="emit('update:search', $event.target.value)"
      />
    </label>
  </div>
</template>

<style scoped>
.card-filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.card-filters__count {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}

.card-filters__filter,
.card-filters__search {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-filters__search {
  max-width: 22rem;
}

.card-filters__search-input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm, 0.35rem);
  background: var(--color-bg-card);
  color: var(--color-ink);
  font: inherit;
}

.card-filters__search-input:focus-visible {
  outline: 2px solid var(--color-indigo);
  outline-offset: 1px;
}

.card-filters__pips {
  display: inline-flex;
  gap: 0.2rem;
  font-size: 0.8rem;
}

.chip[aria-pressed='true'] .chip__mark {
  color: var(--color-on-ink);
}
</style>
