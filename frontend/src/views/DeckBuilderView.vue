<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import DeckBuilder from '../components/cards/DeckBuilder.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useCollectionStore } from '../stores/collection'
import { useDecksStore } from '../stores/decks'

defineOptions({ name: 'DeckBuilderView' })

const { t } = useI18n()
const collection = useCollectionStore()
const decks = useDecksStore()
const newName = ref('')
const message = ref(null)

onMounted(async () => {
  await Promise.all([collection.fetchCollection(), decks.fetchDecks()])
  if (decks.activeDeck) {
    await decks.selectDeck(decks.activeDeck.id)
  } else if (decks.decks[0]) {
    await decks.selectDeck(decks.decks[0].id)
  }
  await decks.fetchPassiveBonuses()
})

async function onCreate() {
  message.value = null
  try {
    await decks.createDeck(newName.value || t('cards.defaultDeckName'))
    newName.value = ''
    message.value = t('cards.deckCreated')
  } catch {
    message.value = decks.error
  }
}

async function onPickDeck(id) {
  message.value = null
  try {
    await decks.selectDeck(id)
  } catch (e) {
    message.value = e.message
  }
}

async function onAdd(collectionId) {
  if (!decks.editingDeck) return
  try {
    await decks.addCard(decks.editingDeck.id, collectionId)
  } catch {
    message.value = decks.error
  }
}

async function onRemove(collectionId) {
  if (!decks.editingDeck) return
  try {
    await decks.removeCard(decks.editingDeck.id, collectionId)
  } catch {
    message.value = decks.error
  }
}

async function onActivate(deckId) {
  try {
    await decks.activateDeck(deckId)
    message.value = t('cards.deckActivated')
  } catch {
    message.value = decks.error
  }
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="deck-builder-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="page-kicker">{{ t('cards.deckKicker') }}</p>
        <h1 class="page-title mt-2">{{ t('cards.deckBuilderTitle') }}</h1>
        <p class="page-lead mt-3 max-w-xl">{{ t('cards.deckBuilderLead') }}</p>
      </div>
      <RouterLink to="/collection" class="btn-ghost text-xs">{{ t('cards.backToCollection') }}</RouterLink>
    </div>

    <EmptyState
      v-if="!collection.loading && !decks.loading && !collection.entries.length"
      class="mt-8"
      :title="t('cards.emptyDeckNoCardsTitle')"
      :lead="t('cards.emptyDeckNoCardsLead')"
      primary-to="/collection"
      :primary-label="t('cards.backToCollection')"
      secondary-to="/shop"
      :secondary-label="t('cards.emptyCollectionShop')"
    />

    <template v-else>
      <div class="mt-6 flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          {{ t('cards.newDeckName') }}
          <input
            v-model="newName"
            type="text"
            data-testid="deck-create-name"
            class="border border-line bg-transparent px-3 py-2 text-sm text-ink"
            :placeholder="t('cards.defaultDeckName')"
          />
        </label>
        <button
          type="button"
          class="btn-primary text-xs"
          data-testid="deck-create-submit"
          :disabled="decks.actionLoading"
          @click="onCreate"
        >
          {{ t('cards.createDeck') }}
        </button>
      </div>

      <EmptyState
        v-if="!decks.loading && !decks.decks.length"
        class="mt-6"
        :title="t('cards.emptyDecksTitle')"
        :lead="t('cards.emptyDecksLead')"
      />

      <div v-if="decks.decks.length" class="mt-4 flex flex-wrap gap-2" data-testid="deck-list">
        <button
          v-for="deck in decks.decks"
          :key="deck.id"
          type="button"
          class="border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition"
          :class="
            decks.editingDeck?.id === deck.id
              ? 'border-accent text-accent'
              : 'border-line text-ink-muted hover:border-accent/50'
          "
          :data-testid="`deck-pick-${deck.id}`"
          @click="onPickDeck(deck.id)"
        >
          {{ deck.name }}
          <span v-if="deck.isActive" class="ml-1 text-accent">●</span>
        </button>
      </div>

      <p v-if="message" class="mt-4 text-sm text-accent">{{ message }}</p>
      <p v-if="decks.error && !message" class="mt-4 text-sm text-fire">{{ decks.error }}</p>

      <div class="mt-8">
        <DeckBuilder
          :deck="decks.editingDeck"
          :collection="collection.entries"
          :constraints="decks.constraints"
          :busy="decks.actionLoading"
          @add="onAdd"
          @remove="onRemove"
          @activate="onActivate"
        />
      </div>
    </template>
  </div>
</template>
