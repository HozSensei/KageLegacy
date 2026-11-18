<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import BoosterSelection from '../components/shop/BoosterSelection.vue';
import BoosterOpening from '../components/shop/BoosterOpening.vue';
import CoinPackCatalog from '../components/shop/CoinPackCatalog.vue';

import BattlePassOffer from '../components/shop/BattlePassOffer.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import marketImage from '../assets/illustrations/market-square.webp';
import { useShopStore } from '../stores/shop';
import { useAuthStore } from '../stores/auth';

defineOptions({ name: 'ShopView' });

const { t, locale } = useI18n();
const shop = useShopStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const isOpeningBooster = ref(false);
/** Élément figé au moment de l’achat (pour le pack d’ouverture). */
const openedElement = ref(null);

const openedBooster = computed(() => {
  const type = shop.lastResult?.boosterType;
  if (!type) return null;
  return shop.boosters.find(b => b.type === type) || null;
});

const openedBoosterName = computed(() => {
  const booster = openedBooster.value;
  if (!booster) return '';
  return locale.value === 'en' ? booster.nameEn : booster.nameFr;
});

const tabs = [
  { id: 'boosters', labelKey: 'shop.tabs.boosters' },

  { id: 'currency', labelKey: 'shop.tabs.currency' },
  { id: 'battlePass', labelKey: 'shop.tabs.battlePass' },
];

const canStubCoins = computed(
  () => Boolean(auth.user?.isAdmin) || Boolean(shop.payments?.coinStubEnabled)
);
const canStubBp = computed(
  () => Boolean(auth.user?.isAdmin) || Boolean(shop.payments?.battlePassStubEnabled)
);
const stripeEnabled = computed(() => Boolean(shop.payments?.stripeEnabled));

onMounted(async () => {
  const tab = String(route.query.tab || shop.activeTab || 'boosters');
  shop.setActiveTab(tabs.some(item => item.id === tab) ? tab : 'boosters');
  await shop.loadTab(shop.activeTab || 'boosters');

  const checkout = String(route.query.checkout || '');
  const sessionId = String(route.query.session_id || '');
  if (checkout === 'success' && sessionId) {
    try {
      await shop.confirmCheckout(sessionId);
    } catch {
      /* error in store */
    }
  } else if (checkout === 'canceled') {
    shop.lastMessage = t('shop.checkoutCanceled');
  }

  if (checkout || sessionId || route.query.tab) {
    const nextQuery = { ...route.query };
    delete nextQuery.checkout;
    delete nextQuery.session_id;
    delete nextQuery.tab;
    router.replace({ path: route.path, query: nextQuery });
  }
});

watch(
  () => shop.activeTab,
  tab => {
    if (tab !== 'boosters') {
      isOpeningBooster.value = false;
      shop.clearResult();
    }
  }
);

async function onSelectTab(tab) {
  shop.clearMessage();
  shop.error = null;
  await shop.loadTab(tab);
}

async function onOpen(type) {
  const element = type === 'elemental' ? shop.selectedElement : null;
  openedElement.value = element;
  try {
    await shop.openBooster(type, { element });
    isOpeningBooster.value = true;
  } catch {
    openedElement.value = null;
  }
}

async function onRepurchase() {
  const type = shop.lastResult?.boosterType;
  if (!type) return;
  await onOpen(type);
}

function onRevealDone() {
  isOpeningBooster.value = false;
  openedElement.value = null;
  shop.clearResult();
  shop.fetchBoosters();
}

async function onBuyPack(packId, method = 'stripe') {
  try {
    await shop.purchaseCoinPack(packId, method);
  } catch {
    /* error in store */
  }
}

async function onUnlockBp(method) {
  try {
    await shop.unlockBattlePass(method);
  } catch {
    /* error in store */
  }
}
</script>

<template>
  <div class="page-shell" data-testid="shop-page">
    <PageHeader
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

    <p v-if="shop.error" class="alert alert--error mt-4" data-testid="shop-error">
      {{ shop.error }}
    </p>
    <p v-if="shop.lastMessage" class="alert alert--success mt-4" data-testid="shop-message">
      {{ shop.lastMessage }}
    </p>
    <p v-if="shop.loading && !isOpeningBooster" class="mt-6 text-ink-muted">
      {{ t('shop.loading') }}
    </p>

    <div v-show="shop.activeTab === 'boosters'" class="mt-8">
      <div v-show="!isOpeningBooster">
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

      <div v-if="isOpeningBooster" class="mt-2">
        <BoosterOpening
          v-if="shop.lastResult"
          :cards="shop.lastResult.cards"
          :active="isOpeningBooster"
          :booster-type="shop.lastResult.boosterType || 'standard'"
          :booster-name="openedBoosterName"
          :element="openedElement"
          :card-count="openedBooster?.cardCount || shop.lastResult.cards?.length || 5"
          :can-repurchase="true"
          :repurchasing="shop.opening"
          @done="onRevealDone"
          @repurchase="onRepurchase"
        />
      </div>
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
