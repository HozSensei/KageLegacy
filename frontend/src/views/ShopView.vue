<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import BoosterSelection from '../components/shop/BoosterSelection.vue';
import BoosterOpening from '../components/shop/BoosterOpening.vue';
import CoinPackCatalog from '../components/shop/CoinPackCatalog.vue';

import BattlePassOffer from '../components/shop/BattlePassOffer.vue';
import WelcomePackBanner from '../components/shop/WelcomePackBanner.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import marketImage from '../assets/illustrations/market-square.webp';
import { useShopStore } from '../stores/shop';
import { useAuthStore } from '../stores/auth';
import { useOnboardingVisit } from '../composables/useOnboardingVisit.js';

defineOptions({ name: 'ShopView' });

const { t, locale } = useI18n();
const shop = useShopStore();
const auth = useAuthStore();
const route = useRoute();
useOnboardingVisit('visit_shop');
const router = useRouter();

const isOpeningBooster = ref(false);
/** Ouverture hors onglet (pack bienvenue / Stripe) — modal plein écran. */
const isRewardCeremony = ref(false);
const canRepurchaseOpening = ref(true);
/** File d’ouvertures restantes (pack bienvenue = 2 parchemins). */
const openingQueue = ref([]);
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

const showOpeningOverlay = computed(() => isOpeningBooster.value && Boolean(shop.lastResult));

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

function normalizeOpeningCards(cards) {
  if (!Array.isArray(cards) || !cards.length) return [];
  // Forme boutique : { card, collectionId, isNew, rarity }
  if (cards[0]?.card) {
    return cards.map(entry => ({
      ...entry,
      rarity: entry.rarity || entry.card?.rarity,
    }));
  }
  // Forme BP stub imbriquée : { entries: [...] }
  return cards.flatMap(reward =>
    (reward.entries || []).map(entry => ({
      ...entry,
      rarity: entry.rarity || entry.card?.rarity,
    }))
  );
}

function packsFromWelcomeGranted(granted) {
  const list = [];
  if (Array.isArray(granted?.boosters) && granted.boosters.length) {
    for (const pack of granted.boosters) {
      const cards = normalizeOpeningCards(pack?.cards || []);
      if (cards.length) {
        list.push({
          boosterType: pack.boosterType || 'standard',
          cards,
        });
      }
    }
    return list;
  }
  if (granted?.booster) {
    const cards = normalizeOpeningCards(granted.booster.cards || []);
    if (cards.length) {
      list.push({
        boosterType: granted.booster.boosterType || 'standard',
        cards,
      });
    }
  }
  return list;
}

async function startRewardOpenings(packs) {
  if (!packs.length) return;
  const [first, ...rest] = packs;
  openingQueue.value = rest;
  canRepurchaseOpening.value = false;
  isRewardCeremony.value = true;
  openedElement.value = null;
  shop.lastResult = {
    boosterType: first.boosterType,
    cards: first.cards,
  };
  if (!shop.boosters.length) {
    await shop.fetchBoosters();
  }
  isOpeningBooster.value = true;
  await nextTick();
  document.getElementById('shop-booster-opening')?.focus?.();
}

onMounted(async () => {
  const tab = String(route.query.tab || shop.activeTab || 'boosters');
  shop.setActiveTab(tabs.some(item => item.id === tab) ? tab : 'boosters');
  await shop.loadTab(shop.activeTab || 'boosters');

  const checkout = String(route.query.checkout || '');
  const sessionId = String(route.query.session_id || '');
  if (checkout === 'success' && sessionId) {
    try {
      const body = await shop.confirmCheckout(sessionId);
      if (body?.product === 'welcome_pack' && body?.granted) {
        await startRewardOpenings(packsFromWelcomeGranted(body.granted));
      }
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
  () => {
    if (isRewardCeremony.value) return;
    isOpeningBooster.value = false;
    openingQueue.value = [];
    canRepurchaseOpening.value = true;
    shop.clearResult();
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
  canRepurchaseOpening.value = true;
  isRewardCeremony.value = false;
  openingQueue.value = [];
  try {
    await shop.openBooster(type, { element });
    isOpeningBooster.value = true;
    await nextTick();
    document.getElementById('shop-booster-opening')?.focus?.();
  } catch {
    openedElement.value = null;
  }
}

async function onRepurchase() {
  const type = shop.lastResult?.boosterType;
  if (!type || !canRepurchaseOpening.value) return;
  await onOpen(type);
}

function onRevealDone() {
  if (openingQueue.value.length) {
    const next = openingQueue.value.shift();
    shop.lastResult = {
      boosterType: next.boosterType,
      cards: next.cards,
    };
    return;
  }
  isOpeningBooster.value = false;
  isRewardCeremony.value = false;
  openedElement.value = null;
  canRepurchaseOpening.value = true;
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

async function onBuyWelcome(method) {
  try {
    const body = await shop.purchaseWelcomePack(method);
    if (body?.granted) {
      await startRewardOpenings(packsFromWelcomeGranted(body.granted));
    }
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
      <BoosterSelection
        :boosters="shop.boosters"
        :balances="shop.balances"
        :elements="shop.elements"
        :selected-element="shop.selectedElement"
        :opening="shop.opening"
        :disabled="shop.loading || isOpeningBooster"
        @open="onOpen"
        @select-element="shop.setSelectedElement"
      />
    </div>

    <div v-show="shop.activeTab === 'currency'" class="mt-8">
      <WelcomePackBanner
        :offer="shop.welcomePack"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :can-stub="canStubCoins"
        :stripe-enabled="stripeEnabled"
        @purchase="onBuyWelcome"
      />
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
      <WelcomePackBanner
        :offer="shop.welcomePack"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :can-stub="canStubCoins"
        :stripe-enabled="stripeEnabled"
        @purchase="onBuyWelcome"
      />
      <BattlePassOffer
        :offer="shop.battlePassOffer"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :can-stub="canStubBp"
        :stripe-enabled="stripeEnabled"
        @unlock="onUnlockBp"
      />
    </div>

    <Teleport to="body">
      <div
        v-if="showOpeningOverlay"
        id="shop-booster-opening"
        class="modal-backdrop shop-opening"
        data-testid="shop-booster-opening"
        role="dialog"
        aria-modal="true"
        :aria-label="t('shop.openingStage')"
        tabindex="-1"
      >
        <div class="modal-panel shop-opening__panel">
          <BoosterOpening
            :cards="shop.lastResult.cards"
            :active="isOpeningBooster"
            :booster-type="shop.lastResult.boosterType || 'standard'"
            :booster-name="openedBoosterName"
            :element="openedElement"
            :card-count="openedBooster?.cardCount || shop.lastResult.cards?.length || 5"
            :can-repurchase="canRepurchaseOpening"
            :repurchasing="shop.opening"
            @done="onRevealDone"
            @repurchase="onRepurchase"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.shop-opening {
  z-index: 140;
}

.shop-opening__panel {
  width: min(42rem, 100%);
  max-height: min(92dvh, 100%);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border-top-color: var(--color-gold-fill, var(--color-gold));
}
</style>
