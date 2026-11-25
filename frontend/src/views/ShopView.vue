<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BoosterSelection from '../components/shop/BoosterSelection.vue';
import BoosterOpening from '../components/shop/BoosterOpening.vue';
import CoinPackCatalog from '../components/shop/CoinPackCatalog.vue';
import FrameCatalog from '../components/shop/FrameCatalog.vue';
import CardEffectCatalog from '../components/shop/CardEffectCatalog.vue';

import BattlePassOffer from '../components/shop/BattlePassOffer.vue';
import WelcomePackBanner from '../components/shop/WelcomePackBanner.vue';
import ItemBlock from '../components/inventory/ItemBlock.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import marketImage from '../assets/illustrations/market-square.webp';
import { useShopStore } from '../stores/shop';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { useOnboardingVisit } from '../composables/useOnboardingVisit.js';
import { useNotificationCopy } from '../composables/useNotificationCopy.js';
import { useToast } from '../composables/useToast.js';
import { localizedDescription, localizedName } from '../utils/localeContent.js';

defineOptions({ name: 'ShopView' });

const { t, locale } = useI18n();
const shop = useShopStore();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const notificationCopy = useNotificationCopy();
const toast = useToast();
const route = useRoute();
useOnboardingVisit('visit_shop');
const router = useRouter();

const isOpeningBooster = ref(false);
/** Ouverture hors onglet (pack bienvenue / Stripe) — modal plein écran. */
const isRewardCeremony = ref(false);

function setBodyScrollLocked(locked) {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = locked ? 'hidden' : '';
}
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

const canAffordRepurchase = computed(() => {
  const booster = openedBooster.value;
  if (!booster) return false;
  return shop.canAfford(booster);
});

const tabs = [
  { id: 'boosters', labelKey: 'shop.tabs.boosters' },
  { id: 'items', labelKey: 'shop.tabs.items' },
  { id: 'cosmetics', labelKey: 'shop.tabs.cosmetics' },
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
const paymentsEnabled = computed(() => shop.payments?.paymentsEnabled !== false);

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

watch(
  showOpeningOverlay,
  locked => setBodyScrollLocked(Boolean(locked)),
  { immediate: true }
);

onBeforeUnmount(() => setBodyScrollLocked(false));

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
  if (!type || !canRepurchaseOpening.value || !canAffordRepurchase.value) return;
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

async function onBuyItem(itemId) {
  try {
    await shop.buyDailyItem(itemId);
    // Rafraîchir l’inbox tout de suite (sinon seulement au changement de route).
    const { fresh } = await notifications.fetchNotifications();
    for (const note of fresh || []) {
      toast.push({
        title: notificationCopy.title(note),
        body: notificationCopy.body(note),
        kind: 'event',
      });
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

    <div v-show="shop.activeTab === 'items'" class="mt-8" data-testid="shop-items">
      <p class="shop-items__lead">{{ t('shop.itemsLead') }}</p>
      <p v-if="shop.dailyItemsRenewsAt" class="shop-items__renew text-ink-muted">
        {{ t('shop.itemsRenews') }}
      </p>
      <ul v-if="shop.dailyItems.length" class="shop-items__list">
        <li v-for="offer in shop.dailyItems" :key="offer.id" class="shop-items__row">
          <ItemBlock
            :item="offer"
            :name="localizedName(offer, locale) || offer.id"
            :description="localizedDescription(offer, locale)"
            :quantity="offer.stock"
            :meta="t('shop.itemsPrice', { n: offer.priceShop ?? offer.price })"
          >
            <template #actions>
              <button
                type="button"
                class="btn-primary btn-sm"
                :disabled="shop.purchasing || shop.loading || offer.stock <= 0"
                @click="onBuyItem(offer.id)"
              >
                {{ offer.stock <= 0 ? t('shop.itemsSoldOut') : t('shop.itemsBuy') }}
              </button>
            </template>
          </ItemBlock>
        </li>
      </ul>
      <p v-else-if="!shop.loading" class="text-ink-muted">{{ t('shop.itemsEmpty') }}</p>
      <RouterLink to="/inventaire" class="btn-ghost btn-sm mt-4">
        {{ t('shop.itemsOpenInventory') }}
      </RouterLink>
    </div>

    <div v-show="shop.activeTab === 'cosmetics'" class="mt-8 shop-cosmetics">
      <FrameCatalog />
      <CardEffectCatalog />
    </div>

    <div v-show="shop.activeTab === 'currency'" class="mt-8">
      <WelcomePackBanner
        :offer="shop.welcomePack"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :can-stub="canStubCoins"
        :stripe-enabled="stripeEnabled"
        :payments-enabled="paymentsEnabled"
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
        :payments-enabled="paymentsEnabled"
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
        :payments-enabled="paymentsEnabled"
        @purchase="onBuyWelcome"
      />
      <BattlePassOffer
        :offer="shop.battlePassOffer"
        :purchasing="shop.purchasing"
        :disabled="shop.loading"
        :can-stub="canStubBp"
        :stripe-enabled="stripeEnabled"
        :payments-enabled="paymentsEnabled"
        @unlock="onUnlockBp"
      />
    </div>

    <Teleport to="body">
      <div
        v-if="showOpeningOverlay"
        id="shop-booster-opening"
        class="shop-opening"
        data-testid="shop-booster-opening"
        role="dialog"
        aria-modal="true"
        :aria-label="t('shop.openingStage')"
        tabindex="-1"
      >
        <div class="shop-opening__scroll">
          <BoosterOpening
            :cards="shop.lastResult.cards"
            :active="isOpeningBooster"
            :booster-type="shop.lastResult.boosterType || 'standard'"
            :booster-name="openedBoosterName"
            :element="openedElement"
            :card-count="openedBooster?.cardCount || shop.lastResult.cards?.length || 5"
            :can-repurchase="canRepurchaseOpening"
            :can-afford-repurchase="canAffordRepurchase"
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
.shop-items__lead {
  margin: 0 0 0.5rem;
  max-width: 36rem;
}

.shop-items__renew {
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

.shop-items__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.shop-items__row {
  min-width: 0;
  list-style: none;
}

.shop-cosmetics {
  display: grid;
  gap: 2rem;
}

/* Cérémonie plein écran — pas de panneau « boîte ». */
.shop-opening {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  padding:
    env(safe-area-inset-top, 0px)
    env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px)
    env(safe-area-inset-left, 0px);
  overscroll-behavior: none;
  animation: fade-in var(--dur-base) ease both;
}

.shop-opening__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: clamp(0.75rem, 2.5vw, 1.5rem) clamp(0.85rem, 3vw, 2rem)
    clamp(1.25rem, 4vw, 2.25rem);
}
</style>
