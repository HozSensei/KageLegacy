<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BoosterSelection from '../components/shop/BoosterSelection.vue'
import BoosterOpening from '../components/shop/BoosterOpening.vue'
import BoosterResults from '../components/shop/BoosterResults.vue'
import CoinPackCatalog from '../components/shop/CoinPackCatalog.vue'
import CosmeticCatalog from '../components/shop/CosmeticCatalog.vue'
import BattlePassOffer from '../components/shop/BattlePassOffer.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import marketImage from '../assets/illustrations/market-square.webp'
import { useShopStore } from '../stores/shop'
import { useAuthStore } from '../stores/auth'

defineOptions({ name: 'ShopView' })

const { t } = useI18n()
const shop = useShopStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const phase = ref('catalog') // catalog | opening | results
const revealDone = ref(false)

const tabs = [
  { id: 'boosters', labelKey: 'shop.tabs.boosters' },
  { id: 'cosmetics', labelKey: 'shop.tabs.cosmetics' },
  { id: 'currency', labelKey: 'shop.tabs.currency' },
  { id: 'battlePass', labelKey: 'shop.tabs.battlePass' },
]

const canStubCoins = computed(
  () => Boolean(auth.user?.isAdmin) || Boolean(shop.payments?.coinStubEnabled),
)
const canStubBp = computed(
  () => Boolean(auth.user?.isAdmin) || Boolean(shop.payments?.battlePassStubEnabled),
)
const stripeEnabled = computed(() => Boolean(shop.payments?.stripeEnabled))

onMounted(async () => {
  const tab = String(route.query.tab || shop.activeTab || 'boosters')
  if (['boosters', 'cosmetics', 'currency', 'battlePass'].includes(tab)) {
    shop.setActiveTab(tab)
  }
  await shop.loadTab(shop.activeTab || 'boosters')

  const checkout = String(route.query.checkout || '')
  const sessionId = String(route.query.session_id || '')
  if (checkout === 'success' && sessionId) {
    try {
      await shop.confirmCheckout(sessionId)
    } catch {
      /* error in store */
    }
  } else if (checkout === 'canceled') {
    shop.lastMessage = t('shop.checkoutCanceled')
  }

  if (checkout || sessionId || route.query.tab) {
    const nextQuery = { ...route.query }
    delete nextQuery.checkout
    delete nextQuery.session_id
    delete nextQuery.tab
    router.replace({ path: route.path, query: nextQuery })
  }
})

watch(
  () => shop.activeTab,
  (tab) => {
    if (tab !== 'boosters') {
      phase.value = 'catalog'
      shop.clearResult()
    }
  },
)

async function onSelectTab(tab) {
  shop.clearMessage()
  shop.error = null
  await shop.loadTab(tab)
}

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

async function onBuyPack(packId, method = 'stripe') {
  try {
    await shop.purchaseCoinPack(packId, method)
  } catch {
    /* error in store */
  }
}

async function onBuyCosmetic(key) {
  try {
    await shop.purchaseCosmetic(key)
  } catch {
    /* error in store */
  }
}

async function onEquipCosmetic(key) {
  try {
    await shop.equipCosmetic(key)
  } catch {
    /* error in store */
  }
}

async function onUnlockBp(method) {
  try {
    await shop.unlockBattlePass(method)
  } catch {
    /* error in store */
  }
}
</script>

<template>
  <div class="page-shell" data-testid="shop-page">
    <PageHeader
      index="06"
      tone="gold"
      :kicker="t('shop.kicker')"
      :title="t('shop.title')"
      :lead="t('shop.lead')"
      :image="marketImage"
      image-position="50% 62%"
    />

    <div class="tabs mt-8" role="tablist" data-testid="shop-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="shop.activeTab === tab.id"
        :data-testid="`shop-tab-${tab.id}`"
        @click="onSelectTab(tab.id)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <p v-if="shop.error" class="alert alert--error mt-4" data-testid="shop-error">{{ shop.error }}</p>
    <p v-if="shop.lastMessage" class="alert alert--success mt-4" data-testid="shop-message">
      {{ shop.lastMessage }}
    </p>
    <p
      v-if="shop.loading && phase === 'catalog'"
      class="mt-6 text-ink-muted"
    >
      {{ t('shop.loading') }}
    </p>

    <div v-show="shop.activeTab === 'boosters'" class="mt-8">
      <div v-show="phase === 'catalog'">
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

      <div v-if="phase === 'opening' || phase === 'results'" class="mt-2">
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

    <div v-show="shop.activeTab === 'cosmetics'" class="mt-8">
      <CosmeticCatalog
        :items="shop.cosmetics"
        :balances="shop.balances"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        @purchase="onBuyCosmetic"
        @equip="onEquipCosmetic"
      />
    </div>

    <div v-show="shop.activeTab === 'currency'" class="mt-8">
      <CoinPackCatalog
        :packs="shop.coinPacks"
        :balances="shop.balances"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :meta-note="shop.coinMeta?.purchaseNote"
        :can-stub="canStubCoins"
        :stripe-enabled="stripeEnabled"
        @purchase="onBuyPack"
      />
    </div>

    <div v-show="shop.activeTab === 'battlePass'" class="mt-8">
      <BattlePassOffer
        :offer="shop.battlePassOffer"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :can-stub="canStubBp"
        :stripe-enabled="stripeEnabled"
        @unlock="onUnlockBp"
      />
    </div>
  </div>
</template>
