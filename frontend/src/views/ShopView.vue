<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BoosterSelection from '../components/shop/BoosterSelection.vue'
import BoosterOpening from '../components/shop/BoosterOpening.vue'
import BoosterResults from '../components/shop/BoosterResults.vue'
import CoinPackCatalog from '../components/shop/CoinPackCatalog.vue'
import CosmeticCatalog from '../components/shop/CosmeticCatalog.vue'
import BattlePassOffer from '../components/shop/BattlePassOffer.vue'
import { useShopStore } from '../stores/shop'
import { useAuthStore } from '../stores/auth'

defineOptions({ name: 'ShopView' })

const { t } = useI18n()
const shop = useShopStore()
const auth = useAuthStore()

const phase = ref('catalog') // catalog | opening | results
const revealDone = ref(false)

const tabs = [
  { id: 'boosters', labelKey: 'shop.tabs.boosters' },
  { id: 'cosmetics', labelKey: 'shop.tabs.cosmetics' },
  { id: 'currency', labelKey: 'shop.tabs.currency' },
  { id: 'battlePass', labelKey: 'shop.tabs.battlePass' },
]

const canStub = computed(() => Boolean(auth.user?.isAdmin))

onMounted(() => {
  shop.loadTab(shop.activeTab || 'boosters')
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

async function onBuyPack(packId) {
  try {
    await shop.purchaseCoinPack(packId, 'stub')
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
  <div class="page-shell page-shell--hero" data-testid="shop-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="page-kicker">{{ t('shop.kicker') }}</p>
        <h1 class="page-title mt-2">{{ t('shop.title') }}</h1>
        <p class="page-lead mt-3 max-w-xl">{{ t('shop.lead') }}</p>
      </div>
    </div>

    <div class="shop-tabs mt-8" role="tablist" data-testid="shop-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="btn-ghost text-[10px]"
        :class="{ 'ring-1 ring-accent/60': shop.activeTab === tab.id }"
        :aria-selected="shop.activeTab === tab.id"
        :data-testid="`shop-tab-${tab.id}`"
        @click="onSelectTab(tab.id)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <p v-if="shop.error" class="mt-4 text-sm text-fire" data-testid="shop-error">{{ shop.error }}</p>
    <p v-if="shop.lastMessage" class="mt-4 text-sm text-accent" data-testid="shop-message">
      {{ shop.lastMessage }}
    </p>
    <p
      v-if="shop.loading && phase === 'catalog'"
      class="mt-6 text-sm text-ink-muted"
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
        :can-stub="canStub"
        @purchase="onBuyPack"
      />
    </div>

    <div v-show="shop.activeTab === 'battlePass'" class="mt-8">
      <BattlePassOffer
        :offer="shop.battlePassOffer"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :can-stub="canStub"
        @unlock="onUnlockBp"
      />
    </div>
  </div>
</template>

<style scoped>
.shop-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
</style>

<style>
.shop-balances {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.shop-balances span {
  letter-spacing: 0.04em;
}

.shop-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .shop-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.shop-tile {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.25rem 1.15rem;
  border: 1px solid color-mix(in srgb, var(--kl-line-mix) 22%, transparent);
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--kl-bg-card) 88%, transparent), var(--kl-bg-soft)),
    radial-gradient(ellipse at top right, color-mix(in srgb, var(--kl-accent) 12%, transparent), transparent 55%);
  animation: shop-tile-in 0.45s ease both;
}

.shop-tile__kicker {
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.shop-tile__name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.15;
  color: var(--color-ink);
}

.shop-tile__desc {
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
  flex: 1;
}

.shop-tile__cost {
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--color-accent);
}

.shop-tile__meta {
  font-size: 0.72rem;
  color: var(--color-ink-faint);
}

@keyframes shop-tile-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
