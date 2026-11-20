<script setup>
import { computed, onMounted, ref } from 'vue';
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
const loadError = ref(null);
const message = ref(null);
const working = ref(false);
const busy = computed(() => working.value || decks.actionLoading);
const feedback = computed(() => {
  if (!message.value) return null;
  const { target, type, key, error } = message.value;
  return { target, type, text: key ? t(key) : cardActionError(error, locale, t) };
});

async function loadDeckBuilder() {
  if (busy.value) return;
  working.value = true;
  loadError.value = null;
  message.value = null;
  decks.editingDeck = null;
  try {
    await Promise.all([collection.fetchCollection(), decks.fetchDecks()]);
    loadError.value = collection.error || decks.error;
    if (loadError.value) return;
    const deck = decks.activeDeck || decks.decks[0];
    if (deck) await decks.selectDeck(deck.id);
  } catch (error) {
    loadError.value = error.message;
  } finally {
    working.value = false;
  }
}

onMounted(loadDeckBuilder);

async function runDeckAction(target, successKey, action) {
  if (busy.value) return;
  working.value = true;
  message.value = null;
  decks.error = null;
  try {
    await action();
    message.value = decks.error
      ? { target, type: 'error', key: 'cards.refreshFailed' }
      : successKey && { target, type: 'success', key: successKey };
  } catch (error) {
    message.value = { target, type: 'error', error: error.message };
  } finally {
    working.value = false;
  }
}

function onCreate() {
  return runDeckAction('create', 'cards.deckCreated', async () => {
    await decks.createDeck(newName.value || t('cards.defaultDeckName'));
    newName.value = '';
  });
}

function onPickDeck(id) {
  return runDeckAction('list', null, () => decks.selectDeck(id));
}

function onDeleteDeck(deck) {
  if (busy.value || !window.confirm(t('cards.confirmDeleteDeck', { name: deck.name }))) return;
  return runDeckAction('list', 'cards.deckDeleted', () => decks.deleteDeck(deck.id));
}

function onAdd(collectionId) {
  if (!decks.editingDeck) return;
  return runDeckAction(`card-${collectionId}`, 'cards.cardAddedToDeck', () =>
    decks.addCard(decks.editingDeck.id, collectionId)
  );
}

function onRemove(collectionId) {
  if (!decks.editingDeck) return;
  return runDeckAction(`card-${collectionId}`, 'cards.cardRemovedFromDeck', () =>
    decks.removeCard(decks.editingDeck.id, collectionId)
  );
}

function onActivate(deckId) {
  return runDeckAction('activate', 'cards.deckActivated', async () => {
    decks.editingDeck = await decks.activateDeck(deckId);
  });
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

    <div v-if="loadError" class="alert alert--error mt-5" role="alert">
      <p>{{ cardActionError(loadError, locale, t) }}</p>
      <button type="button" class="btn-ghost" @click="loadDeckBuilder">{{ t('hub.retry') }}</button>
    </div>

    <section class="panel mt-5" aria-labelledby="deck-rules-title" data-testid="deck-rules">
      <h2 id="deck-rules-title" class="t-kicker">{{ t('cards.deckRules.title') }}</h2>
      <ul class="deck-rules__list">
        <li>{{ t('cards.deckRules.size', decks.constraints) }}</li>
        <li>{{ t('cards.deckRules.copies', decks.constraints) }}</li>
        <li>
          {{
            t(
              'cards.deckRules.clan',
              { maxClan: decks.constraints.maxClan },
              decks.constraints.maxClan
            )
          }}
        </li>
        <li>{{ t('cards.deckRules.rarity', decks.constraints) }}</li>
        <li>{{ t('cards.deckRules.arts', decks.constraints) }}</li>
      </ul>
    </section>

    <EmptyState
      v-if="!collection.loading && !decks.loading && !loadError && !collection.entries.length"
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
          <div
            v-for="deck in decks.decks"
            :key="deck.id"
            class="deck-toolbar__deck-option"
            :class="{ 'deck-toolbar__deck-option--selected': decks.editingDeck?.id === deck.id }"
          >
            <button
              type="button"
              class="chip deck-toolbar__pick"
              :aria-pressed="decks.editingDeck?.id === deck.id"
              :data-testid="`deck-pick-${deck.id}`"
              :disabled="busy"
              @click="onPickDeck(deck.id)"
            >
              <span v-if="deck.isActive" class="dot deck-toolbar__active" aria-hidden="true" />
              {{ deck.name }}
            </button>
            <button
              type="button"
              class="deck-toolbar__delete"
              :aria-label="t('cards.deleteDeck', { name: deck.name })"
              :title="t('cards.deleteDeck', { name: deck.name })"
              :data-testid="`deck-delete-${deck.id}`"
              :disabled="busy"
              @click="onDeleteDeck(deck)"
            >
              ×
            </button>
          </div>
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
            :disabled="busy"
            @click="onCreate"
          >
            {{ t('cards.createDeck') }}
          </button>
        </div>
      </div>

      <p
        v-if="feedback?.target === 'create' || feedback?.target === 'list'"
        class="alert mt-3"
        :class="`alert--${feedback.type}`"
        :role="feedback.type === 'error' ? 'alert' : 'status'"
      >
        {{ feedback.text }}
      </p>

      <EmptyState
        v-if="!decks.loading && !loadError && !decks.decks.length"
        class="mt-6"
        :title="t('cards.emptyDecksTitle')"
        :lead="t('cards.emptyDecksLead')"
      />

      <div class="mt-10">
        <DeckBuilder
          :deck="decks.editingDeck"
          :collection="collection.entries"
          :constraints="decks.constraints"
          :busy="busy"
          :feedback="feedback"
          @add="onAdd"
          @remove="onRemove"
          @activate="onActivate"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.deck-rules__list {
  margin: 0.65rem 0 0;
  padding-inline-start: 1.25rem;
  list-style: disc;
}

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

.deck-toolbar__deck-option {
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-bg-soft);
}

.deck-toolbar__deck-option--selected {
  border-color: var(--color-indigo);
}

.deck-toolbar__pick.chip {
  border: 0;
  border-radius: 999px 0 0 999px;
}

.deck-toolbar__delete {
  display: grid;
  place-items: center;
  width: 2rem;
  border: 0;
  border-left: 1px solid var(--color-line);
  background: transparent;
  font-size: 1.15rem;
  line-height: 1;
  color: var(--color-ink-muted);
  cursor: pointer;
}

.deck-toolbar__deck-option--selected .deck-toolbar__delete {
  background: var(--color-ink);
  color: var(--color-on-ink);
}

.deck-toolbar__delete:hover:not(:disabled) {
  background: var(--color-bg);
  color: var(--color-vermilion);
}

.deck-toolbar__deck-option--selected .deck-toolbar__delete:hover:not(:disabled) {
  background: var(--color-vermilion);
  color: var(--color-on-fill);
}

.deck-toolbar__delete:disabled,
.deck-toolbar__pick:disabled {
  cursor: not-allowed;
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
