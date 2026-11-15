<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CollectionGrid from '../components/cards/CollectionGrid.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import { cardTypeVisual } from '../utils/cardVisuals'
import { useCollectionStore } from '../stores/collection'

defineOptions({ name: 'CollectionView' })

const { t, locale } = useI18n()
const collection = useCollectionStore()
const selected = ref(null)
const message = ref(null)

onMounted(() => {
  collection.fetchCollection()
})

const selectedName = computed(() => {
  const card = selected.value?.card
  if (!card) return ''
  return (locale.value === 'en' ? card.nameEn : card.nameFr) || card.nameFr
})
const selectedDescription = computed(() => {
  const card = selected.value?.card
  if (!card) return ''
  return (locale.value === 'en' ? card.descriptionEn : card.descriptionFr) || card.descriptionFr
})
const selectedVisual = computed(() => cardTypeVisual(selected.value?.card?.type))

function onSelect(entry) {
  selected.value = entry
  message.value = null
}

async function onUpgrade() {
  if (!selected.value) return
  try {
    await collection.upgrade(selected.value.collectionId)
    message.value = t('cards.upgradeSuccess')
    selected.value = collection.findByCollectionId(selected.value.collectionId)
  } catch {
    message.value = collection.error
  }
}

async function onDisenchant() {
  if (!selected.value) return
  try {
    await collection.disenchant(selected.value.collectionId, 1)
    message.value = t('cards.disenchantSuccess')
    selected.value = collection.findByCollectionId(selected.value.collectionId)
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
      :kicker="t('cards.collectionKicker')"
      :title="t('cards.collectionTitle')"
      :lead="t('cards.collectionLead')"
    >
      <template #actions>
        <RouterLink to="/decks" class="btn-primary">{{ t('cards.openDeckBuilder') }}</RouterLink>
      </template>
    </PageHeader>

    <p v-if="collection.error && !message" class="alert alert--error mt-6">{{ collection.error }}</p>
    <p v-if="message" class="alert alert--success mt-6">{{ message }}</p>

    <EmptyState
      v-if="!collection.loading && !collection.entries.length"
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
          :entries="collection.entries"
          :selected-id="selected?.collectionId"
          :loading="collection.loading"
          @select="onSelect"
        />
      </div>

      <aside class="collection-detail" :data-tone="selected ? selectedVisual.tone : 'neutral'">
        <p class="collection-detail__kicker">
          <span
            class="shape"
            :class="`shape--${selected ? selectedVisual.shape : 'lozenge'}`"
            aria-hidden="true"
          />
          {{ selected ? t(`cards.types.${selected.card.type}`, selected.card.type) : t('cards.detailTitle') }}
        </p>
        <h2 class="sr-only">{{ t('cards.detailTitle') }}</h2>

        <Transition name="rise" mode="out-in">
          <div v-if="selected" :key="selected.collectionId" class="collection-detail__body">
            <p class="collection-detail__name">{{ selectedName }}</p>
            <p class="mt-3 leading-relaxed text-ink">{{ selectedDescription }}</p>

            <div class="collection-detail__passive">
              <p class="t-kicker">{{ t('cards.passiveBonus') }}</p>
              <ul class="collection-detail__passive-list">
                <li v-for="(value, key) in selected.card.passiveBonus" :key="key">
                  <span class="figure figure--sm">+{{ value }}</span>
                  {{ t(`cards.stats.${key}`, key) }}
                </li>
              </ul>
            </div>

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
          </div>
          <p v-else class="mt-4 text-ink-muted">{{ t('cards.selectCardHint') }}</p>
        </Transition>
      </aside>
    </div>
  </div>
</template>

<style scoped>
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
