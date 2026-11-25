<script setup>
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { cardTypeVisual, rarityVisual } from '../../utils/cardVisuals';
import { OWNERSHIP_FILTERS } from '../../utils/cardOwnershipFilter.js';

const props = defineProps({
  typeFilter: { type: String, default: '' },
  rarityFilter: { type: String, default: '' },
  artFilter: { type: String, default: '' },
  search: { type: String, default: '' },
  ownershipFilter: { type: String, default: '' },
  showOwnershipFilter: { type: Boolean, default: false },
  resultCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  searchTestId: { type: String, default: 'card-filter-search' },
});

const emit = defineEmits([
  'update:typeFilter',
  'update:rarityFilter',
  'update:artFilter',
  'update:search',
  'update:ownershipFilter',
  'reset',
]);

const { t } = useI18n();
const open = ref(false);
const panelId = useId();

const types = ['', 'attack', 'defense', 'skill', 'item', 'summon'];
const rarities = ['', 'common', 'rare', 'legendary', 'mythic'];
const arts = ['', 'taijutsu', 'ninjutsu', 'genjutsu', 'medicine', 'common'];
const ownershipOptions = OWNERSHIP_FILTERS;

const activeCount = computed(() => {
  let count = 0;
  if (props.typeFilter) count += 1;
  if (props.rarityFilter) count += 1;
  if (props.artFilter) count += 1;
  if (props.search.trim()) count += 1;
  if (props.showOwnershipFilter && props.ownershipFilter) count += 1;
  return count;
});

const toggleLabel = computed(() =>
  t(open.value ? 'cards.filterHide' : 'cards.filterShow', { count: activeCount.value })
);

function togglePanel() {
  open.value = !open.value;
}

function onReset() {
  emit('update:typeFilter', '');
  emit('update:rarityFilter', '');
  emit('update:artFilter', '');
  emit('update:search', '');
  if (props.showOwnershipFilter) emit('update:ownershipFilter', '');
  emit('reset');
}
</script>

<template>
  <div class="card-filters" data-testid="card-filters">
    <div class="card-filters__toolbar">
      <p class="card-filters__count" data-testid="card-filter-count" aria-live="polite">
        {{ t('cards.filterResults', { count: resultCount, total: totalCount }) }}
      </p>

      <div class="card-filters__actions">
        <button
          v-if="activeCount > 0"
          type="button"
          class="btn-ghost btn-sm"
          data-testid="card-filter-reset"
          @click="onReset"
        >
          {{ t('cards.filterReset') }}
        </button>

        <button
          type="button"
          class="btn-icon card-filters__toggle"
          :aria-expanded="open"
          :aria-controls="panelId"
          :aria-label="toggleLabel"
          :title="toggleLabel"
          data-testid="card-filter-toggle"
          @click="togglePanel"
        >
          <AppIcon name="filter_alt" size="1.2rem" />
          <span
            v-if="activeCount > 0"
            class="card-filters__badge"
            data-testid="card-filter-active-count"
            aria-hidden="true"
          >
            {{ activeCount }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-show="open"
      :id="panelId"
      class="card-filters__panel"
      data-testid="card-filter-panel"
    >
      <div
        v-if="showOwnershipFilter"
        class="card-filters__filter"
        role="group"
        :aria-label="t('cards.filterOwnership')"
      >
        <span class="t-kicker">{{ t('cards.filterOwnership') }}</span>
        <div class="chip-row">
          <button
            v-for="option in ownershipOptions"
            :key="option || 'all'"
            type="button"
            class="chip"
            :aria-pressed="ownershipFilter === option"
            :data-testid="`card-filter-ownership-${option || 'all'}`"
            @click="emit('update:ownershipFilter', option)"
          >
            {{
              option
                ? t(`cards.ownershipFilters.${option}`)
                : t('cards.ownershipFilters.all')
            }}
          </button>
        </div>
      </div>

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
  </div>
</template>

<style scoped>
.card-filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.card-filters__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
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

.card-filters__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.card-filters__toggle {
  position: relative;
  border: 1px solid var(--color-line-strong);
}

.card-filters__toggle[aria-expanded='true'] {
  background: var(--color-ink);
  color: var(--color-on-ink);
}

.card-filters__badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--color-vermilion);
  color: var(--color-on-fill);
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15rem;
  text-align: center;
}

.card-filters__panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0 0.15rem;
  border-top: 1px solid var(--color-line);
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
