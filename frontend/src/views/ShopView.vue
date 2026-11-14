<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BoosterSelection from '../components/shop/BoosterSelection.vue'
import BoosterOpening from '../components/shop/BoosterOpening.vue'
import BoosterResults from '../components/shop/BoosterResults.vue'
import { useShopStore } from '../stores/shop'

defineOptions({ name: 'ShopView' })

const { t } = useI18n()
const shop = useShopStore()

const phase = ref('catalog') // catalog | opening | results
const revealDone = ref(false)

onMounted(() => {
  shop.fetchBoosters()
})

async function onOpen(type) {
  revealDone.value = false
  try {
    const element = type === 'elemental' ? shop.selectedElement : null
    await shop.openBooster(type, { element })
    phase.value = 'opening'
  } catch {
    phase.value = 'catalog'
  }
}

function onRevealDone() {
  revealDone.value = true
  phase.value = 'results'
}

function onAgain() {
  shop.clearResult()
  phase.value = 'catalog'
  shop.fetchBoosters()
}

function onCloseResults() {
  shop.clearResult()
  phase.value = 'catalog'
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="shop-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="page-kicker">{{ t('shop.kicker') }}</p>
        <h1 class="page-title mt-2">{{ t('shop.title') }}</h1>
        <p class="page-lead mt-3 max-w-xl">{{ t('shop.lead') }}</p>
      </div>
    </div>

    <p v-if="shop.error" class="mt-4 text-sm text-fire" data-testid="shop-error">{{ shop.error }}</p>
    <p v-if="shop.loading && phase === 'catalog'" class="mt-6 text-sm text-ink-muted">
      {{ t('shop.loading') }}
    </p>

    <div v-show="phase === 'catalog'" class="mt-8">
      <BoosterSelection
        :boosters="shop.boosters"
        :balances="shop.balances"
        :elements="shop.elements"
        :selected-element="shop.selectedElement"
        :opening="shop.opening"
        :disabled="shop.loading"
        @open="onOpen"
        @select-element="shop.setSelectedElement"
      />
    </div>

    <div v-if="phase === 'opening' || phase === 'results'" class="mt-8">
      <BoosterOpening
        v-if="shop.lastResult"
        :cards="shop.lastResult.cards"
        :active="phase === 'opening' || phase === 'results'"
        @done="onRevealDone"
      />
      <BoosterResults
        v-if="phase === 'results' && shop.lastResult && revealDone"
        :result="shop.lastResult"
        @again="onAgain"
        @close="onCloseResults"
      />
    </div>
  </div>
</template>
