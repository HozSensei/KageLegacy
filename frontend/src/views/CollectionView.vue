<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';
import CollectionGrid from '../components/cards/CollectionGrid.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { cardTypeVisual } from '../utils/cardVisuals';
import { localizedDescription, localizedName } from '../utils/localeContent.js';
import { cardActionError } from '../utils/cardActionErrors.js';
import forestImage from '../assets/illustrations/forest-path.webp';
import CardAnatomyOverlay from '../components/cards/CardAnatomyOverlay.vue';
import { useCollectionStore } from '../stores/collection';
import { useShopStore } from '../stores/shop';
import { useCardAnatomyGuide } from '../composables/useCardAnatomyGuide.js';
import { useOnboardingVisit } from '../composables/useOnboardingVisit.js';

defineOptions({ name: 'CollectionView' });

const { t, locale } = useI18n();
const route = useRoute();
const collection = useCollectionStore();
useOnboardingVisit('visit_collection');
const { open: anatomyOpen, dismiss: dismissAnatomy } = useCardAnatomyGuide();
const shop = useShopStore();
const selection = ref(null);
const feedback = ref(null);
const actionPending = ref(false);

onMounted(() => {
  collection.fetchCollectionView();
});

const selectedSlot = computed(() => {
  if (!selection.value) return null;
  const slot = collection.catalogueSlots.find(s => Number(s.card.id) === selection.value.cardId);
  return !slot || (collection.ownedOnly && slot.kind === 'hole') ? null : slot;
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
/** Garder les filtres accessibles tant que le catalogue contient des cartes. */
const showEmptyState = computed(() => {
  if (busy.value || collection.error) return false;
  return !collection.catalogueTotal && !collection.entries.length;
});

function onSelect(slot) {
  selection.value = { cardId: Number(slot.card.id) };
  feedback.value = null;
}

function onOwnedOnlyUpdate(value) {
  if (value && isHole.value) {
    selection.value = null;
    feedback.value = null;
  }
  collection.setOwnedOnly(value);
}

async function onAction(action) {
  if (!selected.value || actionsBusy.value || (action === 'upgrade' && !canUpgrade.value)) return;
  // L'identité de la sélection distingue aussi A → B → A pendant la requête.
  const source = selection.value;
  const { collectionId } = selected.value;
  feedback.value = null;
  actionPending.value = true;
  try {
    const result = await collection[action](collectionId);
    const balances = result.resources || (await shop.fetchBalances());
    if (result.resources) shop.balances = result.resources;
    if (selection.value !== source) return;
    if (!selectedSlot.value) selection.value = null;
    feedback.value =
      result.refreshFailed || !balances
        ? { action, type: 'error', key: 'cards.refreshFailed' }
        : { action, type: 'success', key: `cards.${action}Success` };
  } catch (error) {
    if (selection.value === source)
      feedback.value = { action, type: 'error', error: error.message };
  } finally {
    actionPending.value = false;
  }
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
      <div class="min-w-0">
        <CollectionGrid
          :slots="collection.catalogueSlots"
          :selected-key="selectedKey"
          :loading="busy"
          :owned-only="collection.ownedOnly"
          :owned-count="collection.ownedUniqueCount"
          :catalogue-total="collection.catalogueTotal"
          :initial-search="collectionSearch"
          @select="onSelect"
          @update:owned-only="onOwnedOnlyUpdate"
        />
      </div>

      <aside
        class="collection-detail"
        data-testid="collection-detail"
        :data-tone="selectedCard && !isHole ? selectedVisual.tone : 'neutral'"
      >
        <p class="collection-detail__kicker">
          <span
            class="shape"
            :class="`shape--${selectedCard && !isHole ? selectedVisual.shape : 'lozenge'}`"
            aria-hidden="true"
          />
          {{
            isHole
              ? t('cards.missingBadge')
              : selectedCard
                ? t(`cards.types.${selectedCard.type}`, selectedCard.type)
                : t('cards.detailTitle')
          }}
        </p>
        <h2 class="sr-only">{{ t('cards.detailTitle') }}</h2>

        <Transition name="rise" mode="out-in">
          <div
            v-if="isHole && selectedSlot"
            :key="`hole-${selectedKey}`"
            class="collection-detail__body"
          >
            <p class="collection-detail__name">
              {{ t('cards.missingCardTitle', { n: selectedSlot.catalogueNumber }) }}
            </p>
            <p class="collection-detail__missing">{{ t('cards.missingDetail') }}</p>
            <p class="mt-3 leading-relaxed text-ink-muted">{{ t('cards.missingHint') }}</p>
            <p class="mt-6">
              <RouterLink to="/shop" class="btn-primary btn-block">{{
                t('cards.emptyCollectionShop')
              }}</RouterLink>
            </p>
          </div>
          <div
            v-else-if="selectedCard"
            :key="`card-${selectedKey}`"
            class="collection-detail__body"
          >
            <p class="collection-detail__name">{{ selectedName }}</p>
            <p v-if="selectedSlot?.catalogueNumber != null" class="collection-detail__catalogue-n">
              {{ t('cards.catalogueNumberLabel', { n: selectedSlot.catalogueNumber }) }}
            </p>
            <p class="mt-3 leading-relaxed text-ink">{{ selectedDescription }}</p>

            <div v-if="selectedCard.passiveBonus" class="collection-detail__passive">
              <p class="t-kicker">{{ t('cards.passiveBonus') }}</p>
              <ul class="collection-detail__passive-list">
                <li v-for="(value, key) in selectedCard.passiveBonus" :key="key">
                  <span class="figure figure--sm">+{{ value }}</span>
                  {{ t(`cards.stats.${key}`, key) }}
                </li>
              </ul>
            </div>

            <template v-if="selected">
              <dl class="collection-detail__figures">
                <div>
                  <dt class="t-kicker">{{ t('cards.quantityLabel') }}</dt>
                  <dd class="figure figure--md">×{{ selected.quantity }}</dd>
                </div>
                <div>
                  <dt class="t-small">
                    {{ t('cards.upgradeLevel', { level: selected.upgradeLevel }) }}
                  </dt>
                  <dd class="collection-detail__levels" aria-hidden="true">
                    <span
                      v-for="n in 2"
                      :key="n"
                      class="lozenge"
                      :class="{ 'lozenge--hollow': n > selected.upgradeLevel }"
                    />
                  </dd>
                </div>
              </dl>

              <div class="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  class="btn-primary btn-block"
                  data-testid="collection-upgrade"
                  :disabled="actionsBusy || !canUpgrade"
                  @click="onAction('upgrade')"
                >
                  <span>{{ t('cards.upgrade') }}</span>
                  <span v-if="upgradeCost" class="collection-detail__action-cost">
                    <span
                      v-if="upgradeCost.ryos"
                      :title="t('resources.ryos', { n: upgradeCost.ryos.toLocaleString(locale) })"
                      ><AppIcon name="ryos" size="0.9rem" /><span class="sr-only">{{
                        t('resources.ryos', { n: upgradeCost.ryos.toLocaleString(locale) })
                      }}</span
                      ><span aria-hidden="true">{{
                        upgradeCost.ryos.toLocaleString(locale)
                      }}</span></span
                    >
                    <span
                      v-if="upgradeCost.dust"
                      :title="t('resources.dust', { n: upgradeCost.dust.toLocaleString(locale) })"
                      ><AppIcon name="dust" size="0.9rem" /><span class="sr-only">{{
                        t('resources.dust', { n: upgradeCost.dust.toLocaleString(locale) })
                      }}</span
                      ><span aria-hidden="true">{{
                        upgradeCost.dust.toLocaleString(locale)
                      }}</span></span
                    >
                    <span
                      v-if="upgradeCost.essence"
                      :title="
                        t('resources.essence', { n: upgradeCost.essence.toLocaleString(locale) })
                      "
                      ><AppIcon name="essence" size="0.9rem" /><span class="sr-only">{{
                        t('resources.essence', { n: upgradeCost.essence.toLocaleString(locale) })
                      }}</span
                      ><span aria-hidden="true">{{
                        upgradeCost.essence.toLocaleString(locale)
                      }}</span></span
                    >
                  </span>
                  <span v-else class="sr-only">{{ t('cards.upgradeUnavailable') }}</span>
                </button>
                <p
                  v-if="feedback?.action === 'upgrade'"
                  class="alert"
                  :class="`alert--${feedback.type}`"
                  role="status"
                  data-testid="collection-upgrade-feedback"
                >
                  {{ feedbackText }}
                </p>
                <p v-if="upgradeUnavailableReason" class="collection-detail__action-hint">
                  {{ upgradeUnavailableReason }}
                </p>
                <button
                  type="button"
                  class="btn-ghost btn-block"
                  data-testid="collection-disenchant"
                  :disabled="actionsBusy"
                  @click="onAction('disenchant')"
                >
                  <span>{{ t('cards.disenchant') }}</span>
                  <span class="collection-detail__action-cost" data-gain="true">
                    <span
                      v-if="selected.actionPreview?.disenchantGain?.dust"
                      :title="
                        t('resources.dust', {
                          n: selected.actionPreview.disenchantGain.dust.toLocaleString(locale),
                        })
                      "
                      ><AppIcon name="dust" size="0.9rem" /><span class="sr-only">{{
                        t('resources.dust', {
                          n: selected.actionPreview.disenchantGain.dust.toLocaleString(locale),
                        })
                      }}</span
                      ><span aria-hidden="true"
                        >+{{
                          selected.actionPreview.disenchantGain.dust.toLocaleString(locale)
                        }}</span
                      ></span
                    >
                    <span
                      v-if="selected.actionPreview?.disenchantGain?.essence"
                      :title="
                        t('resources.essence', {
                          n: selected.actionPreview.disenchantGain.essence.toLocaleString(locale),
                        })
                      "
                      ><AppIcon name="essence" size="0.9rem" /><span class="sr-only">{{
                        t('resources.essence', {
                          n: selected.actionPreview.disenchantGain.essence.toLocaleString(locale),
                        })
                      }}</span
                      ><span aria-hidden="true"
                        >+{{
                          selected.actionPreview.disenchantGain.essence.toLocaleString(locale)
                        }}</span
                      ></span
                    >
                  </span>
                </button>
                <p
                  v-if="feedback?.action === 'disenchant'"
                  class="alert"
                  :class="`alert--${feedback.type}`"
                  role="status"
                  data-testid="collection-disenchant-feedback"
                >
                  {{ feedbackText }}
                </p>
              </div>
            </template>
          </div>
          <p v-else class="mt-4 text-ink-muted">{{ t('cards.selectCardHint') }}</p>
        </Transition>
        <p
          v-if="!selected && feedback"
          class="alert mt-4"
          :class="`alert--${feedback.type}`"
          role="status"
          :data-testid="`collection-${feedback.action}-feedback`"
        >
          {{ feedbackText }}
        </p>
      </aside>
    </div>
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
  display: grid;
  gap: 2rem;
  margin-top: var(--space-block);
}

.collection-detail {
  align-self: start;
  padding: 1.25rem 1.25rem 1.5rem;
  border-top: 6px solid var(--tone-fill);
  background: var(--color-bg-card);
  transition: border-color var(--dur-base) ease;
}

.collection-detail__kicker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tone);
}

.collection-detail__name {
  margin-top: 0.85rem;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem);
  font-weight: 800;
  font-stretch: 80%;
  line-height: 0.98;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.collection-detail__missing {
  margin-top: 0.55rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.collection-detail__catalogue-n {
  margin-top: 0.35rem;
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-weight: 700;
  font-stretch: 85%;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-faint);
}

.collection-detail__passive {
  margin-top: 1.25rem;
  padding: 0.85rem 1rem;
  background: var(--color-bg-soft);
}

.collection-detail__passive-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0.6rem 0 0;
  padding: 0;
  list-style: none;
  font-weight: 500;
}

.collection-detail__passive-list .figure {
  display: inline-block;
  min-width: 2.25rem;
  color: var(--color-indigo);
}

.collection-detail__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.collection-detail__figures dd {
  margin-top: 0.5rem;
}

.collection-detail__action-hint {
  margin: -0.2rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.collection-detail__action-cost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.collection-detail__action-cost span {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.collection-detail__action-cost[data-gain='true'] {
  color: var(--color-leaf);
}

.collection-detail__levels {
  display: flex;
  gap: 0.45rem;
  padding-top: 0.35rem;
  font-size: 1.5rem;
  color: var(--color-vermilion);
}

@media (min-width: 1024px) {
  .collection-layout {
    grid-template-columns: minmax(0, 1fr) 19rem;
    gap: 2.5rem;
  }

  .collection-detail {
    position: sticky;
    top: 5rem;
  }
}
</style>
