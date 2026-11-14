<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CollectionGrid from '../components/cards/CollectionGrid.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useCollectionStore } from '../stores/collection'

defineOptions({ name: 'CollectionView' })

const { t } = useI18n()
const collection = useCollectionStore()
const selected = ref(null)
const message = ref(null)

onMounted(() => {
  collection.fetchCollection()
})

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
  <div class="page-shell page-shell--hero" data-testid="collection-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="page-kicker">{{ t('cards.collectionKicker') }}</p>
        <h1 class="page-title mt-2">{{ t('cards.collectionTitle') }}</h1>
        <p class="page-lead mt-3 max-w-xl">{{ t('cards.collectionLead') }}</p>
      </div>
      <RouterLink to="/decks" class="btn-primary text-xs">{{ t('cards.openDeckBuilder') }}</RouterLink>
    </div>

    <p v-if="collection.error && !message" class="mt-4 text-sm text-fire">{{ collection.error }}</p>
    <p v-if="message" class="mt-4 text-sm text-accent">{{ message }}</p>

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

    <div v-else class="mt-8 lg:grid lg:grid-cols-12 lg:gap-8">
      <div class="lg:col-span-8">
        <CollectionGrid
          :entries="collection.entries"
          :selected-id="selected?.collectionId"
          :loading="collection.loading"
          @select="onSelect"
        />
      </div>

      <aside class="mt-8 border border-line/70 p-5 lg:col-span-4 lg:mt-0">
        <h2 class="font-display text-xl text-ink">{{ t('cards.detailTitle') }}</h2>
        <template v-if="selected">
          <p class="mt-3 font-display text-2xl text-ink">{{ selected.card.nameFr }}</p>
          <p class="mt-2 text-sm text-ink-muted">{{ selected.card.descriptionFr }}</p>

          <div class="mt-4 border-t border-accent/30 pt-4">
            <p class="text-[11px] uppercase tracking-[0.14em] text-accent">
              {{ t('cards.passiveBonus') }}
            </p>
            <ul class="mt-2 space-y-1 text-sm text-ink">
              <li v-for="(value, key) in selected.card.passiveBonus" :key="key">
                <span class="text-accent">+{{ value }}</span>
                {{ t(`cards.stats.${key}`, key) }}
              </li>
            </ul>
          </div>

          <p class="mt-4 text-xs text-ink-faint">
            {{ t('cards.upgradeLevel', { level: selected.upgradeLevel }) }}
            · ×{{ selected.quantity }}
          </p>

          <div class="mt-5 flex flex-col gap-2">
            <button
              type="button"
              class="btn-primary text-xs"
              :disabled="collection.actionLoading || selected.upgradeLevel >= 2"
              @click="onUpgrade"
            >
              {{ t('cards.upgrade') }}
            </button>
            <button
              type="button"
              class="btn-ghost text-xs"
              :disabled="collection.actionLoading"
              @click="onDisenchant"
            >
              {{ t('cards.disenchant') }}
            </button>
          </div>
        </template>
        <p v-else class="mt-3 text-sm text-ink-muted">{{ t('cards.selectCardHint') }}</p>
      </aside>
    </div>
  </div>
</template>
