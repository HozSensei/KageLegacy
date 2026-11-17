<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import DeckBuilder from '../components/cards/DeckBuilder.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import bridgeImage from '../assets/illustrations/stone-bridge.webp';
import { useCollectionStore } from '../stores/collection';
import { useDecksStore } from '../stores/decks';
import { cardActionError } from '../utils/cardActionErrors.js';

defineOptions({ name: 'DeckBuilderView' });

const { t, locale } = useI18n();
const collection = useCollectionStore();
const decks = useDecksStore();
const newName = ref('');
const message = ref(null);

async function loadDeckBuilder() {
  message.value = null;
  decks.editingDeck = null;
  await Promise.all([collection.fetchCollection(), decks.fetchDecks()]);
  if (collection.error || decks.error) return;
  const deck = decks.activeDeck || decks.decks[0];
  if (deck) {
    try {
      await decks.selectDeck(deck.id);
    } catch (error) {
      message.value = { type: 'error', error: error.message };
    }
  }
}

onMounted(loadDeckBuilder);

async function onCreate() {
  message.value = null;
  try {
    await decks.createDeck(newName.value || t('cards.defaultDeckName'));
    newName.value = '';
    message.value = decks.error
      ? { type: 'error', key: 'cards.refreshFailed' }
      : { type: 'success', key: 'cards.deckCreated' };
  } catch (error) {
    message.value = { type: 'error', error: error.message };
  }
}

async function onPickDeck(id) {
  message.value = null;
  decks.error = null;
  try {
    await decks.selectDeck(id);
  } catch (e) {
    message.value = { type: 'error', error: e.message };
  }
}

async function onAdd(collectionId) {
  if (!decks.editingDeck) return;
  message.value = null;
  try {
    await decks.addCard(decks.editingDeck.id, collectionId);
    message.value = decks.error
      ? { type: 'error', key: 'cards.refreshFailed' }
      : { type: 'success', key: 'cards.cardAddedToDeck' };
  } catch (error) {
    message.value = { type: 'error', error: error.message };
  }
}

async function onRemove(collectionId) {
  if (!decks.editingDeck) return;
  message.value = null;
  try {
    await decks.removeCard(decks.editingDeck.id, collectionId);
    message.value = decks.error
      ? { type: 'error', key: 'cards.refreshFailed' }
      : { type: 'success', key: 'cards.cardRemovedFromDeck' };
  } catch (error) {
    message.value = { type: 'error', error: error.message };
  }
}

async function onActivate(deckId) {
  message.value = null;
  decks.error = null;
  try {
    const activated = await decks.activateDeck(deckId);
    decks.editingDeck = activated;
    message.value = decks.error
      ? { type: 'error', key: 'cards.refreshFailed' }
      : { type: 'success', key: 'cards.deckActivated' };
  } catch (error) {
    message.value = { type: 'error', error: error.message };
  }
}
</script>

<template>
  <div class="page-shell" data-testid="deck-builder-page">
    <PageHeader
      tone="sky"
      :kicker="t('cards.deckKicker')"
      :title="t('cards.deckBuilderTitle')"
      :lead="t('cards.deckBuilderLead')"
      :image="bridgeImage"
      image-position="50% 45%"
    >
      <template #actions>
        <RouterLink to="/collection" class="btn-ghost">{{
          t('cards.backToCollection')
        }}</RouterLink>
      </template>
    </PageHeader>

    <p v-if="message" class="alert mt-5" :class="`alert--${message.type}`" role="status">
      {{ message.key ? t(message.key) : cardActionError(message.error, locale, t) }}
    </p>
    <div
      v-if="(collection.error || decks.error) && !message"
      class="alert alert--error mt-5"
      role="alert"
    >
      <p>{{ cardActionError(collection.error || decks.error, locale, t) }}</p>
      <button type="button" class="btn-ghost" @click="loadDeckBuilder">{{ t('hub.retry') }}</button>
    </div>

    <EmptyState
      v-if="
        !collection.loading &&
        !decks.loading &&
        !collection.error &&
        !decks.error &&
        !collection.entries.length
      "
      class="mt-8"
      :title="t('cards.emptyDeckNoCardsTitle')"
      :lead="t('cards.emptyDeckNoCardsLead')"
      primary-to="/collection"
      :primary-label="t('cards.backToCollection')"
      secondary-to="/shop"
      :secondary-label="t('cards.emptyCollectionShop')"
    />

    <template v-else>
      <div class="deck-toolbar">
        <div v-if="decks.decks.length" class="chip-row deck-toolbar__list" data-testid="deck-list">
          <button
            v-for="deck in decks.decks"
            :key="deck.id"
            type="button"
            class="chip"
            :aria-pressed="decks.editingDeck?.id === deck.id"
            :data-testid="`deck-pick-${deck.id}`"
            @click="onPickDeck(deck.id)"
          >
            <span v-if="deck.isActive" class="dot deck-toolbar__active" aria-hidden="true" />
            {{ deck.name }}
          </button>
        </div>

        <div class="deck-toolbar__create">
          <label class="field deck-toolbar__field">
            <span class="field__label">{{ t('cards.newDeckName') }}</span>
            <input
              v-model="newName"
              type="text"
              data-testid="deck-create-name"
              class="input-field"
              :placeholder="t('cards.defaultDeckName')"
            />
          </label>
          <button
            type="button"
            class="btn-secondary deck-toolbar__submit"
            data-testid="deck-create-submit"
            :disabled="decks.actionLoading"
            @click="onCreate"
          >
            {{ t('cards.createDeck') }}
          </button>
        </div>
      </div>

      <EmptyState
        v-if="!decks.loading && !decks.error && !decks.decks.length"
        class="mt-6"
        :title="t('cards.emptyDecksTitle')"
        :lead="t('cards.emptyDecksLead')"
      />

      <div class="mt-10">
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

<style scoped>
.deck-toolbar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.75rem;
  /* Keep create field clear of sticky app-bar when scrolled into view. */
  scroll-margin-top: 4.5rem;
}

.deck-toolbar__active {
  color: var(--color-leaf-fill);
}

.deck-toolbar__create {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.6rem;
}

.deck-toolbar__field {
  flex: 1 1 14rem;
  max-width: 22rem;
}

.deck-toolbar__submit {
  min-height: 2.75rem;
}

@media (min-width: 900px) {
  .deck-toolbar {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  .deck-toolbar__list {
    flex: 1;
    order: 0;
  }

  .deck-toolbar__create {
    flex: none;
    width: 24rem;
    flex-wrap: nowrap;
  }
}
</style>
