<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CollectionGrid from '../components/cards/CollectionGrid.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import { cardTypeVisual } from '../utils/cardVisuals'
import { localizedDescription, localizedName } from '../utils/localeContent.js'
import forestImage from '../assets/illustrations/forest-path.webp'
import { useCollectionStore } from '../stores/collection'

defineOptions({ name: 'CollectionView' })

const { t, locale } = useI18n()
const collection = useCollectionStore()
/** Slot sélectionné : owned (entry) ou hole (card only). */
const selectedSlot = ref(null)
const message = ref(null)

onMounted(() => {
  collection.fetchCollectionView()
})

const selected = computed(() => selectedSlot.value?.entry || null)
const selectedCard = computed(() => selectedSlot.value?.card || null)
const selectedKey = computed(() => selectedSlot.value?.key || null)
const isHole = computed(() => selectedSlot.value?.kind === 'hole')

const selectedName = computed(() => {
  const card = selectedCard.value
  if (!card) return ''
  return localizedName(card, locale.value)
})
const selectedDescription = computed(() => {
  const card = selectedCard.value
  if (!card) return ''
  return localizedDescription(card, locale.value)
})
const selectedVisual = computed(() => cardTypeVisual(selectedCard.value?.type))

const busy = computed(() => collection.loading || collection.catalogueLoading)
/** EmptyState seulement en mode « possédées » sans cartes, ou catalogue + collection vides. */
const showEmptyState = computed(() => {
  if (busy.value) return false
  if (collection.ownedOnly) return !collection.entries.length
  return !collection.catalogueTotal && !collection.entries.length
})

function onSelect(slot) {
  selectedSlot.value = slot
  message.value = null
}

function onOwnedOnlyUpdate(value) {
  collection.setOwnedOnly(value)
  if (value && selectedSlot.value?.kind === 'hole') {
    selectedSlot.value = null
  }
}

async function onUpgrade() {
  if (!selected.value) return
  try {
    await collection.upgrade(selected.value.collectionId)
    message.value = t('cards.upgradeSuccess')
    const next = collection.findByCollectionId(selected.value.collectionId)
    if (next) {
      selectedSlot.value = {
        kind: 'owned',
        key: `owned-${next.collectionId}`,
        card: next.card,
        entry: next,
      }
    }
  } catch {
    message.value = collection.error
  }
}

async function onDisenchant() {
  if (!selected.value) return
  try {
    const id = selected.value.collectionId
    await collection.disenchant(id, 1)
    message.value = t('cards.disenchantSuccess')
    const next = collection.findByCollectionId(id)
    if (next) {
      selectedSlot.value = {
        kind: 'owned',
        key: `owned-${next.collectionId}`,
        card: next.card,
        entry: next,
      }
    } else {
      const card =
        collection.catalogue.find((c) => Number(c.id) === Number(selectedCard.value?.id)) ||
        selectedCard.value
      selectedSlot.value = card
        ? { kind: 'hole', key: `hole-${card.id}`, card, entry: null }
        : null
    }
  } catch {
    message.value = collection.error
  }
}
</script>

<template>
  <div class="page-shell" data-testid="collection-page">
    <PageHeader
      index="04"
      tone="wood"
      layout="overlay"
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

    <p v-if="collection.error && !message" class="alert alert--error mt-6">{{ collection.error }}</p>
    <p v-if="message" class="alert alert--success mt-6">{{ message }}</p>

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
          @select="onSelect"
          @update:owned-only="onOwnedOnlyUpdate"
        />
      </div>

      <aside class="collection-detail" :data-tone="selectedCard ? selectedVisual.tone : 'neutral'">
        <p class="collection-detail__kicker">
          <span
            class="shape"
            :class="`shape--${selectedCard ? selectedVisual.shape : 'lozenge'}`"
            aria-hidden="true"
          />
          {{
            selectedCard
              ? t(`cards.types.${selectedCard.type}`, selectedCard.type)
              : t('cards.detailTitle')
          }}
        </p>
        <h2 class="sr-only">{{ t('cards.detailTitle') }}</h2>

        <Transition name="rise" mode="out-in">
          <div v-if="selectedCard" :key="selectedKey" class="collection-detail__body">
            <p class="collection-detail__name">{{ selectedName }}</p>
            <p v-if="isHole" class="collection-detail__missing">{{ t('cards.missingDetail') }}</p>
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

            <template v-if="selected && !isHole">
              <dl class="collection-detail__figures">
                <div>
                  <dt class="t-kicker">{{ t('cards.quantityLabel') }}</dt>
                  <dd class="figure figure--md">×{{ selected.quantity }}</dd>
                </div>
                <div>
                  <dt class="t-small">{{ t('cards.upgradeLevel', { level: selected.upgradeLevel }) }}</dt>
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
                  :disabled="collection.actionLoading || selected.upgradeLevel >= 2"
                  @click="onUpgrade"
                >
                  {{ t('cards.upgrade') }}
                </button>
                <button
                  type="button"
                  class="btn-ghost btn-block"
                  :disabled="collection.actionLoading"
                  @click="onDisenchant"
                >
                  {{ t('cards.disenchant') }}
                </button>
              </div>
            </template>

            <p v-else-if="isHole" class="mt-6">
              <RouterLink to="/shop" class="btn-primary btn-block">{{
                t('cards.emptyCollectionShop')
              }}</RouterLink>
            </p>
          </div>
          <p v-else class="mt-4 text-ink-muted">{{ t('cards.selectCardHint') }}</p>
        </Transition>
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
