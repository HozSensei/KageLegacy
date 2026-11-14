<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CardDisplay from './CardDisplay.vue'
import { cardTypeVisual, rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'CollectionGrid' })

const props = defineProps({
  entries: { type: Array, default: () => [] },
  selectedId: { type: Number, default: null },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const { t } = useI18n()

const typeFilter = ref('')
const rarityFilter = ref('')

const filtered = computed(() => {
  return props.entries.filter((entry) => {
    if (typeFilter.value && entry.card?.type !== typeFilter.value) return false
    if (rarityFilter.value && entry.card?.rarity !== rarityFilter.value) return false
    return true
  })
})

const types = ['', 'attack', 'defense', 'skill', 'item', 'summon']
const rarities = ['', 'common', 'rare', 'legendary', 'mythic']
</script>

<template>
  <div class="collection-grid" data-testid="collection-grid">
    <div class="collection-grid__filters">
      <div class="collection-grid__filter" role="group" :aria-label="t('cards.filterType')">
        <span class="t-kicker">{{ t('cards.filterType') }}</span>
        <div class="chip-row">
          <button
            v-for="type in types"
            :key="type || 'all'"
            type="button"
            class="chip"
            :aria-pressed="typeFilter === type"
            :data-tone="type ? cardTypeVisual(type).tone : 'neutral'"
            @click="typeFilter = type"
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
      <div class="collection-grid__filter" role="group" :aria-label="t('cards.filterRarity')">
        <span class="t-kicker">{{ t('cards.filterRarity') }}</span>
        <div class="chip-row">
          <button
            v-for="rarity in rarities"
            :key="rarity || 'all'"
            type="button"
            class="chip"
            :aria-pressed="rarityFilter === rarity"
            :data-tone="rarity ? rarityVisual(rarity).tone : 'neutral'"
            @click="rarityFilter = rarity"
          >
            <span v-if="rarity" class="collection-grid__pips chip__mark" aria-hidden="true">
              <span v-for="n in rarityVisual(rarity).pips" :key="n" class="lozenge" />
            </span>
            {{ rarity ? t(`cards.rarities.${rarity}`) : t('cards.filterAll') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="loading" class="text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="!filtered.length" class="alert">{{ t('cards.emptyCollection') }}</p>

    <div v-else class="collection-grid__list stagger">
      <CardDisplay
        v-for="entry in filtered"
        :key="entry.collectionId"
        :card="entry.card"
        :quantity="entry.quantity"
        :upgrade-level="entry.upgradeLevel"
        :selected="selectedId === entry.collectionId"
        @select="emit('select', entry)"
      />
    </div>
  </div>
</template>

<style scoped>
.collection-grid__filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.collection-grid__filter {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.collection-grid__pips {
  display: inline-flex;
  gap: 0.2rem;
  font-size: 0.8rem;
}

.chip[aria-pressed='true'] .chip__mark {
  color: var(--color-on-ink);
}

.collection-grid__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  gap: 1rem;
  align-items: stretch;
}
</style>
