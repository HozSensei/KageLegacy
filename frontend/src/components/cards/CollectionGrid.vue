<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CardDisplay from './CardDisplay.vue'

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
      <label class="collection-grid__filter">
        <span>{{ t('cards.filterType') }}</span>
        <select v-model="typeFilter" class="input-field">
          <option v-for="type in types" :key="type || 'all'" :value="type">
            {{ type ? t(`cards.types.${type}`) : t('cards.filterAll') }}
          </option>
        </select>
      </label>
      <label class="collection-grid__filter">
        <span>{{ t('cards.filterRarity') }}</span>
        <select v-model="rarityFilter" class="input-field">
          <option v-for="rarity in rarities" :key="rarity || 'all'" :value="rarity">
            {{ rarity ? t(`cards.rarities.${rarity}`) : t('cards.filterAll') }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="!filtered.length" class="text-sm text-ink-muted">{{ t('cards.emptyCollection') }}</p>

    <div v-else class="collection-grid__list">
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
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.collection-grid__filter {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted, #9aa3b2);
}

.collection-grid__filter select {
  min-width: 10rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: inherit;
  padding: 0.4rem 0.6rem;
}

.collection-grid__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
}
</style>
