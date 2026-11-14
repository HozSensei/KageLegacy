<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CardDisplay from './CardDisplay.vue'

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
</script>

<template>
  <div class="deck-builder" data-testid="deck-builder">
    <div v-if="!deck" class="text-sm text-ink-muted">{{ t('cards.selectOrCreateDeck') }}</div>

    <template v-else>
      <header class="deck-builder__header">
        <div>
          <h2 class="font-display text-2xl text-ink">{{ deck.name }}</h2>
          <p class="mt-1 text-sm text-ink-muted">
            {{ t('cards.deckSize', { size, min: constraints.min, max: constraints.max }) }}
            <span v-if="deck.isActive" class="ml-2 text-accent">{{ t('cards.activeDeck') }}</span>
          </p>
        </div>
        <button
          v-if="!deck.isActive"
          type="button"
          class="btn-primary text-xs"
          :disabled="busy"
          @click="emit('activate', deck.id)"
        >
          {{ t('cards.activateDeck') }}
        </button>
      </header>

      <p
        v-if="validation && !validation.valid"
        class="mt-3 text-sm text-fire"
        data-testid="deck-validation"
      >
        {{ validation.errors.join(' ') }}
      </p>

      <section v-if="passiveList.length" class="deck-builder__passives mt-4">
        <h3 class="text-[11px] uppercase tracking-[0.14em] text-accent">
          {{ t('cards.deckPassives') }}
        </h3>
        <ul class="mt-2 flex flex-wrap gap-2">
          <li
            v-for="entry in passiveList"
            :key="entry.key"
            class="border border-line px-2 py-1 text-xs text-ink"
          >
            <span class="text-accent">+{{ entry.value }}</span> {{ entry.label }}
          </li>
        </ul>
      </section>

      <div class="deck-builder__panels mt-6">
        <section>
          <h3 class="mb-3 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            {{ t('cards.inDeck') }}
          </h3>
          <div v-if="!deck.cards?.length" class="text-sm text-ink-faint">{{ t('cards.deckEmpty') }}</div>
          <ul v-else class="space-y-2">
            <li
              v-for="entry in deck.cards"
              :key="entry.deckCardId"
              class="flex items-center gap-3 border border-line/60 px-3 py-2"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate font-display text-ink">{{ cardName(entry.card) }}</p>
                <p class="text-xs text-ink-muted">×{{ entry.quantity }}</p>
              </div>
              <button
                type="button"
                class="btn-ghost text-[10px]"
                :disabled="busy"
                @click="emit('remove', entry.collectionId)"
              >
                {{ t('cards.remove') }}
              </button>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="mb-3 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            {{ t('cards.fromCollection') }}
          </h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="entry in collection"
              :key="entry.collectionId"
              class="relative"
            >
              <CardDisplay
                :card="entry.card"
                :quantity="entry.quantity"
                :upgrade-level="entry.upgradeLevel"
                compact
              />
              <button
                type="button"
                class="btn-primary mt-2 w-full text-[10px]"
                :disabled="busy || !canAdd(entry)"
                @click="emit('add', entry.collectionId)"
              >
                {{ t('cards.addToDeck') }}
                <span v-if="inDeckQty(entry.collectionId)" class="opacity-70">
                  ({{ inDeckQty(entry.collectionId) }})
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
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.deck-builder__panels {
  display: grid;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .deck-builder__panels {
    grid-template-columns: minmax(240px, 0.9fr) 1.4fr;
  }
}
</style>
