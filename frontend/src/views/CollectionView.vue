<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';
import CollectionDetailPanel from '../components/cards/CollectionDetailPanel.vue';
import CollectionGrid from '../components/cards/CollectionGrid.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import { cardTypeVisual } from '../utils/cardVisuals';
import { localizedDescription, localizedName } from '../utils/localeContent.js';
import { cardActionError } from '../utils/cardActionErrors.js';
import forestImage from '../assets/illustrations/forest-path.webp';
import CardAnatomyOverlay from '../components/cards/CardAnatomyOverlay.vue';
import { useCollectionStore } from '../stores/collection';
import { useDecksStore } from '../stores/decks';
import { useShopStore } from '../stores/shop';
import { useCardAnatomyGuide } from '../composables/useCardAnatomyGuide.js';
import { useOnboardingVisit } from '../composables/useOnboardingVisit.js';
import {
  cardDefinitionIdsFromDecks,
  slotMatchesOwnershipFilter,
} from '../utils/cardOwnershipFilter.js';

defineOptions({ name: 'CollectionView' });

/** Desktop : popover ancré près de la carte ; en dessous : bottom sheet. */
const ANCHOR_MIN_WIDTH = 768;

const { t, locale } = useI18n();
const route = useRoute();
const collection = useCollectionStore();
const decks = useDecksStore();
useOnboardingVisit('visit_collection');
const { open: anatomyOpen, dismiss: dismissAnatomy } = useCardAnatomyGuide();
const shop = useShopStore();
const selection = ref(null);
const selectionAnchor = ref(null);
const detailOpen = ref(false);
const feedback = ref(null);
const actionPending = ref(false);
const detailShell = ref(null);
const panelStyle = ref({});
const useAnchored = ref(false);

onMounted(() => {
  collection.fetchCollectionView();
  decks.fetchDecks();
  updateLayoutMode();
  document.addEventListener('pointerdown', onDocumentPointer, true);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('scroll', onViewportChange, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointer, true);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onViewportChange);
  window.removeEventListener('scroll', onViewportChange, true);
});

const activeDeckCardIds = computed(() =>
  cardDefinitionIdsFromDecks(decks.decks, { activeOnly: true })
);
const anyDeckCardIds = computed(() => cardDefinitionIdsFromDecks(decks.decks));

const selectedSlot = computed(() => {
  if (!selection.value) return null;
  const slot = collection.catalogueSlots.find(s => Number(s.card.id) === selection.value.cardId);
  if (!slot) return null;
  return slotMatchesOwnershipFilter(
    slot,
    collection.ownershipFilter,
    activeDeckCardIds.value,
    anyDeckCardIds.value
  )
    ? slot
    : null;
});
const selected = computed(() => selectedSlot.value?.entry || null);
const selectedCard = computed(() => selectedSlot.value?.card || null);
const selectedKey = computed(() => selectedSlot.value?.key || null);
const isHole = computed(() => selectedSlot.value?.kind === 'hole');

const selectedName = computed(() => {
  const card = selectedCard.value;
  if (!card) return '';
  return localizedName(card, locale.value);
});
const selectedDescription = computed(() => {
  const card = selectedCard.value;
  if (!card) return '';
  return localizedDescription(card, locale.value);
});
const collectionSearch = computed(() => {
  const value = route.query.search;
  return String(Array.isArray(value) ? value[0] || '' : value || '');
});
const selectedVisual = computed(() => cardTypeVisual(selectedCard.value?.type));

const busy = computed(() => collection.loading || collection.catalogueLoading);
const actionsBusy = computed(() => busy.value || actionPending.value || collection.actionLoading);
const feedbackText = computed(() => {
  if (!feedback.value) return '';
  const { key, error } = feedback.value;
  return key ? t(key) : cardActionError(error, locale.value, t);
});
const upgradeCost = computed(() => selected.value?.actionPreview?.upgradeCost || null);
const canUpgrade = computed(() => Boolean(upgradeCost.value));
const upgradeUnavailableReason = computed(() => {
  if (!selected.value || canUpgrade.value) return null;
  if (!selectedCard.value?.upgradable) return t('cards.upgradeUnavailable');
  if (selectedCard.value?.rarity === 'mythic' && selected.value.upgradeLevel >= 1) {
    return t('cards.upgradeMythicMax');
  }
  if (selected.value.upgradeLevel >= 2) return t('cards.upgradeMaxLevel');
  return t('cards.upgradeUnavailable');
});

const detailMode = computed(() => {
  if (isHole.value && selectedSlot.value) return 'hole';
  if (selectedCard.value) return 'card';
  return 'empty';
});

const detailKicker = computed(() => {
  if (isHole.value) return t('cards.missingBadge');
  if (selectedCard.value) return t(`cards.types.${selectedCard.value.type}`, selectedCard.value.type);
  return t('cards.detailTitle');
});

/** Garder les filtres accessibles tant que le catalogue contient des cartes. */
const showEmptyState = computed(() => {
  if (busy.value || collection.error) return false;
  return !collection.catalogueTotal && !collection.entries.length;
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateLayoutMode() {
  useAnchored.value = typeof window !== 'undefined' && window.innerWidth >= ANCHOR_MIN_WIDTH;
}

function positionPanel() {
  if (!detailOpen.value || !useAnchored.value) {
    panelStyle.value = {};
    return;
  }
  const el = detailShell.value;
  if (!el) return;

  const margin = 12;
  const width = Math.min(22 * 16, window.innerWidth - margin * 2);
  const panelHeight = el.offsetHeight || 360;
  const anchor = selectionAnchor.value;
  let left = margin;
  let top = margin;

  if (anchor && typeof anchor.getBoundingClientRect === 'function') {
    const rect = anchor.getBoundingClientRect();
    // Préférer à droite de la carte ; sinon à gauche ; sinon centré sous la carte.
    const right = rect.right + margin;
    const leftOf = rect.left - width - margin;
    if (right + width <= window.innerWidth - margin) {
      left = right;
      top = rect.top;
    } else if (leftOf >= margin) {
      left = leftOf;
      top = rect.top;
    } else {
      left = rect.left + rect.width / 2 - width / 2;
      const below = rect.bottom + margin;
      const above = rect.top - panelHeight - margin;
      top = below + panelHeight <= window.innerHeight - margin ? below : above;
    }
  } else {
    left = (window.innerWidth - width) / 2;
    top = Math.max(margin, window.innerHeight * 0.1);
  }

  left = clamp(left, margin, window.innerWidth - width - margin);
  top = clamp(top, margin, Math.max(margin, window.innerHeight - panelHeight - margin));

  panelStyle.value = {
    width: `${width}px`,
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
  };
}

async function refreshPanelPosition() {
  if (!detailOpen.value) return;
  await nextTick();
  positionPanel();
  await nextTick();
  positionPanel();
}

function closeDetail() {
  detailOpen.value = false;
  selection.value = null;
  selectionAnchor.value = null;
  panelStyle.value = {};
}

function onSelect(payload) {
  const slot = payload?.slot ?? payload;
  const anchorEl = payload?.anchorEl ?? null;
  const cardId = Number(slot.card.id);
  if (detailOpen.value && selection.value?.cardId === cardId) {
    closeDetail();
    return;
  }
  selection.value = { cardId };
  selectionAnchor.value = anchorEl;
  detailOpen.value = true;
  feedback.value = null;
  refreshPanelPosition();
}

function onOwnershipFilterUpdate(value) {
  collection.setOwnershipFilter(value);
  if (
    selection.value &&
    !slotMatchesOwnershipFilter(
      collection.catalogueSlots.find(s => Number(s.card.id) === selection.value.cardId),
      value,
      activeDeckCardIds.value,
      anyDeckCardIds.value
    )
  ) {
    closeDetail();
    feedback.value = null;
  }
}

function onDocumentPointer(event) {
  if (!detailOpen.value) return;
  const target = event.target;
  if (detailShell.value?.contains(target)) return;
  if (
    selectionAnchor.value &&
    typeof selectionAnchor.value.contains === 'function' &&
    selectionAnchor.value.contains(target)
  ) {
    return;
  }
  // La sélection de carte gère le toggle ; ignorer les clics sur d’autres cellules
  // serait trop agressif — fermer sur extérieur hors grille sélectionnée.
  const inGridCell = target?.closest?.('.collection-grid__cell');
  if (inGridCell) return;
  closeDetail();
}

function onKeydown(event) {
  if (event.key === 'Escape' && detailOpen.value) {
    event.preventDefault();
    closeDetail();
  }
}

function onViewportChange() {
  updateLayoutMode();
  if (detailOpen.value) positionPanel();
}

watch(
  () => [detailOpen.value, selectedKey.value, useAnchored.value],
  () => {
    if (detailOpen.value) refreshPanelPosition();
  }
);

watch(selectedSlot, slot => {
  if (detailOpen.value && !slot) {
    // Carte filtrée / désenchantée jusqu’à disparition : fermer le panneau.
    if (!selection.value) return;
    const stillExists = collection.catalogueSlots.some(
      s => Number(s.card.id) === selection.value.cardId
    );
    if (!stillExists) closeDetail();
  }
});

async function onAction(action) {
  if (!selected.value || actionsBusy.value || (action === 'upgrade' && !canUpgrade.value)) return;
  const source = selection.value;
  const { collectionId } = selected.value;
  feedback.value = null;
  actionPending.value = true;
  try {
    const result = await collection[action](collectionId);
    const balances = result.resources || (await shop.fetchBalances());
    if (result.resources) shop.balances = result.resources;
    if (selection.value !== source) return;
    if (!selectedSlot.value) {
      closeDetail();
    }
    feedback.value =
      result.refreshFailed || !balances
        ? { action, type: 'error', key: 'cards.refreshFailed' }
        : { action, type: 'success', key: `cards.${action}Success` };
    refreshPanelPosition();
  } catch (error) {
    if (selection.value === source)
      feedback.value = { action, type: 'error', error: error.message };
  } finally {
    actionPending.value = false;
  }
}

function resourceLabel(kind, amount) {
  return t(`resources.${kind}`, { n: Number(amount).toLocaleString(locale.value) });
}
</script>

<template>
  <div class="page-shell" data-testid="collection-page">
    <CardAnatomyOverlay :open="anatomyOpen" @dismiss="dismissAnatomy" />
    <PageHeader
      tone="wood"
      :kicker="t('cards.collectionKicker')"
      :title="t('cards.collectionTitle')"
      :lead="t('cards.collectionLead')"
      :image="forestImage"
      image-position="50% 40%"
    >
      <template #actions>
        <p class="collection-progress" data-testid="collection-header-count">
          {{
            t('cards.collectionProgress', {
              owned: collection.ownedUniqueCount,
              total: collection.catalogueTotal,
            })
          }}
        </p>
        <RouterLink to="/decks" class="btn-primary">{{ t('cards.openDeckBuilder') }}</RouterLink>
      </template>
    </PageHeader>

    <div
      v-if="collection.error"
      class="alert alert--error mt-6"
      role="alert"
      data-testid="collection-load-error"
    >
      <p>{{ cardActionError(collection.error, locale, t) }}</p>
      <button type="button" class="btn-ghost" @click="collection.fetchCollectionView()">
        {{ t('hub.retry') }}
      </button>
    </div>

    <EmptyState
      v-if="showEmptyState"
      class="mt-8"
      :title="t('cards.emptyCollectionTitle')"
      :lead="t('cards.emptyCollectionLead')"
      primary-to="/shop"
      :primary-label="t('cards.emptyCollectionShop')"
      secondary-to="/missions"
      :secondary-label="t('cards.emptyCollectionMissions')"
    />

    <div v-else class="collection-layout">
      <CollectionGrid
        :slots="collection.catalogueSlots"
        :selected-key="selectedKey"
        :loading="busy"
        :ownership-filter="collection.ownershipFilter"
        :initial-search="collectionSearch"
        :active-deck-card-ids="activeDeckCardIds"
        :any-deck-card-ids="anyDeckCardIds"
        @select="onSelect"
        @update:ownership-filter="onOwnershipFilterUpdate"
      />
    </div>

    <Teleport to="body">
      <Transition name="collection-detail-backdrop">
        <div
          v-if="detailOpen && !useAnchored"
          class="collection-detail-backdrop"
          data-testid="collection-detail-backdrop"
          @click="closeDetail"
        />
      </Transition>

      <Transition :name="useAnchored ? 'collection-detail-pop' : 'collection-detail-sheet'">
        <div
          v-if="detailOpen"
          ref="detailShell"
          class="collection-detail-shell"
          :class="
            useAnchored ? 'collection-detail-shell--anchored' : 'collection-detail-shell--sheet'
          "
          role="dialog"
          :aria-modal="useAnchored ? 'false' : 'true'"
          :aria-label="t('cards.detailTitle')"
          data-testid="collection-detail-shell"
          :style="useAnchored ? panelStyle : undefined"
          @click.stop
        >
          <CollectionDetailPanel
            :mode="detailMode"
            :kicker="detailKicker"
            :tone="selectedCard && !isHole ? selectedVisual.tone : 'neutral'"
            :shape="selectedCard && !isHole ? selectedVisual.shape : 'lozenge'"
            :name="
              isHole
                ? t('cards.missingCardTitle', { n: selectedSlot?.catalogueNumber })
                : selectedName
            "
            :catalogue-label="
              selectedSlot?.catalogueNumber != null && !isHole
                ? t('cards.catalogueNumberLabel', { n: selectedSlot.catalogueNumber })
                : ''
            "
            :description="selectedDescription"
            :missing-detail="t('cards.missingDetail')"
            :missing-hint="t('cards.missingHint')"
            :shop-label="t('cards.emptyCollectionShop')"
            :passive-bonus="selectedCard?.passiveBonus || null"
            :passive-bonus-label="t('cards.passiveBonus')"
            :stat-label="key => t(`cards.stats.${key}`, key)"
            :quantity-label="t('cards.quantityLabel')"
            :quantity="selected?.quantity ?? null"
            :upgrade-level-label="
              selected ? t('cards.upgradeLevel', { level: selected.upgradeLevel }) : ''
            "
            :upgrade-level="selected?.upgradeLevel ?? 0"
            :upgrade-label="t('cards.upgrade')"
            :upgrade-cost="upgradeCost"
            :can-upgrade="canUpgrade"
            :upgrade-unavailable-reason="upgradeUnavailableReason"
            :disenchant-label="t('cards.disenchant')"
            :disenchant-gain="selected?.actionPreview?.disenchantGain || null"
            :actions-busy="actionsBusy"
            :feedback="feedback"
            :feedback-text="feedbackText"
            :empty-hint="t('cards.selectCardHint')"
            :close-label="t('common.dismiss')"
            :locale="locale"
            :resource-label="resourceLabel"
            @close="closeDetail"
            @upgrade="onAction('upgrade')"
            @disenchant="onAction('disenchant')"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.collection-progress {
  margin: 0;
  align-self: center;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  color: inherit;
  opacity: 0.85;
}

.collection-layout {
  margin-top: var(--space-block);
}

.collection-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: var(--color-scrim);
}

.collection-detail-shell {
  z-index: 60;
}

.collection-detail-shell--anchored {
  position: fixed;
  max-width: calc(100vw - 1.5rem);
  max-height: min(40rem, calc(100dvh - 1.5rem));
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  box-shadow: 0 0.85rem 2rem rgb(8 10 24 / 0.38);
}

.collection-detail-shell--sheet {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  max-height: min(88dvh, 40rem);
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  box-shadow: 0 -0.5rem 1.75rem rgb(8 10 24 / 0.4);
}

.collection-detail-backdrop-enter-active,
.collection-detail-backdrop-leave-active {
  transition: opacity 200ms ease;
}

.collection-detail-backdrop-enter-from,
.collection-detail-backdrop-leave-to {
  opacity: 0;
}

.collection-detail-pop-enter-active {
  transition:
    opacity 180ms ease,
    transform 220ms var(--ease-out-quint);
}

.collection-detail-pop-leave-active {
  transition:
    opacity 120ms ease,
    transform 140ms ease-in;
}

.collection-detail-pop-enter-from,
.collection-detail-pop-leave-to {
  opacity: 0;
  transform: translateY(0.35rem) scale(0.98);
}

.collection-detail-sheet-enter-active {
  transition: transform 280ms var(--ease-out-quint);
}

.collection-detail-sheet-leave-active {
  transition: transform 170ms ease-in;
}

.collection-detail-sheet-enter-from,
.collection-detail-sheet-leave-to {
  transform: translateY(100%);
}
</style>
