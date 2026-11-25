import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { readApiError, parseApiResponse } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useShopStore = defineStore('shop', () => {
  const activeTab = ref('boosters'); // boosters | items | cosmetics | currency | battlePass

  const boosters = ref([]);
  const dailyItems = ref([]);
  const dailyItemsRenewsAt = ref(null);
  const balances = ref({ ryos: 0, dust: 0, essence: 0, kageCoins: 0 });
  const elements = ref([]);
  const coinPacks = ref([]);
  const frames = ref([]);
  const cardEffects = ref([]);

  const battlePassOffer = ref(null);
  const welcomePack = ref(null);
  const coinMeta = ref(null);
  const payments = ref({
    paymentsEnabled: true,
    stripeEnabled: false,
    coinStubEnabled: false,
    battlePassStubEnabled: false,
  });

  const loading = ref(false);
  const opening = ref(false);
  const purchasing = ref(false);
  const error = ref(null);
  const errorCode = ref(null);
  const lastResult = ref(null);
  const lastMessage = ref(null);
  const selectedElement = ref(null);

  const canAfford = computed(() => booster => {
    if (!booster?.cost) return false;
    const ryos = balances.value.ryos || 0;
    const coins = balances.value.kageCoins || 0;
    return ryos >= (booster.cost.ryos || 0) && coins >= (booster.cost.kageCoins || 0);
  });

  function applyBalances(next) {
    if (next) balances.value = next;
  }

  function applyPayments(next) {
    if (!next || typeof next !== 'object') return;
    payments.value = {
      paymentsEnabled: next.paymentsEnabled !== false,
      stripeEnabled: Boolean(next.stripeEnabled),
      coinStubEnabled: Boolean(next.coinStubEnabled),
      battlePassStubEnabled: Boolean(next.battlePassStubEnabled),
    };
  }

  async function fetchBalances() {
    try {
      const res = await fetch(`${API_BASE}/api/shop/balances`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyBalances(body.balances);
      return body.balances;
    } catch (e) {
      error.value = e.message;
      return null;
    }
  }

  async function fetchBoosters() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/boosters`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      boosters.value = body.boosters || [];
      applyBalances(body.balances);
      elements.value = body.elements || [];
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCoinPacks() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/coin-packs`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      coinPacks.value = body.packs || [];
      welcomePack.value = body.welcomePack || null;
      applyBalances(body.balances);
      applyPayments(body.payments);
      coinMeta.value = body.meta || null;
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchBattlePassOffer() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/battle-pass`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      battlePassOffer.value = body;
      welcomePack.value = body.welcomePack || null;
      applyBalances(body.balances);
      applyPayments(body.payments);
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDailyItems() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/items`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      dailyItems.value = body.offers || [];
      dailyItemsRenewsAt.value = body.renewsAt || null;
      await fetchBalances();
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchFrames() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/frames`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      frames.value = body.frames || [];
      applyBalances(body.balances);
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCardEffects() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/card-effects`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      cardEffects.value = body.cardEffects || [];
      applyBalances(body.balances);
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCosmetics() {
    loading.value = true;
    error.value = null;
    try {
      const [framesRes, effectsRes] = await Promise.all([
        fetch(`${API_BASE}/api/shop/frames`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/shop/card-effects`, { credentials: 'include' }),
      ]);
      const framesParsed = await parseApiResponse(framesRes);
      const effectsParsed = await parseApiResponse(effectsRes);
      if (!framesParsed.ok) throw new Error(await readApiError(framesRes, framesParsed.body));
      if (!effectsParsed.ok) throw new Error(await readApiError(effectsRes, effectsParsed.body));
      frames.value = framesParsed.body.frames || [];
      cardEffects.value = effectsParsed.body.cardEffects || [];
      applyBalances(effectsParsed.body.balances || framesParsed.body.balances);
      return { frames: frames.value, cardEffects: cardEffects.value };
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function buyDailyItem(itemId) {
    purchasing.value = true;
    error.value = null;
    errorCode.value = null;
    lastMessage.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/items/${encodeURIComponent(itemId)}/buy`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) {
        const err = new Error(await readApiError(res, body));
        err.code = body?.code || null;
        throw err;
      }
      if (body.offers?.offers) dailyItems.value = body.offers.offers;
      else if (Array.isArray(body.offers)) dailyItems.value = body.offers;
      if (body.offers?.renewsAt) dailyItemsRenewsAt.value = body.offers.renewsAt;
      applyBalances(body.balances);
      lastMessage.value = null;
      return body;
    } catch (e) {
      error.value = e.message;
      errorCode.value = e.code || null;
      throw e;
    } finally {
      purchasing.value = false;
    }
  }

  async function purchaseFrame(frameId, { currency = 'ryos' } = {}) {
    purchasing.value = true;
    error.value = null;
    try {
      const res = await fetch(
        `${API_BASE}/api/shop/frames/${encodeURIComponent(frameId)}/purchase`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency }),
        },
      );
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyBalances(body.balances);
      frames.value = frames.value.map(frame =>
        frame.id === frameId ? { ...frame, owned: true } : frame,
      );
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      purchasing.value = false;
    }
  }

  async function purchaseCardEffect(effectId, { currency = 'ryos' } = {}) {
    purchasing.value = true;
    error.value = null;
    try {
      const res = await fetch(
        `${API_BASE}/api/shop/card-effects/${encodeURIComponent(effectId)}/purchase`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency }),
        },
      );
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyBalances(body.balances);
      cardEffects.value = cardEffects.value.map(effect =>
        effect.id === effectId ? { ...effect, owned: true } : effect,
      );
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      purchasing.value = false;
    }
  }

  async function loadTab(tab = activeTab.value) {
    activeTab.value = tab;
    if (tab === 'boosters') return fetchBoosters();
    if (tab === 'items') return fetchDailyItems();
    if (tab === 'currency') return fetchCoinPacks();
    if (tab === 'battlePass') return fetchBattlePassOffer();
    if (tab === 'cosmetics') return fetchCosmetics();
    return null;
  }

  async function openBooster(type, { element = null } = {}) {
    opening.value = true;
    error.value = null;
    try {
      const payload = {};
      if (element) payload.element = element;
      const res = await fetch(`${API_BASE}/api/shop/boosters/${encodeURIComponent(type)}/open`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      lastResult.value = body;
      applyBalances(body.balances);
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      opening.value = false;
    }
  }

  async function purchaseCoinPack(packId, method = 'stripe') {
    purchasing.value = true;
    error.value = null;
    lastMessage.value = null;
    try {
      const res = await fetch(
        `${API_BASE}/api/shop/coin-packs/${encodeURIComponent(packId)}/purchase`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method }),
        }
      );
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (body.mode === 'stripe_checkout' && body.url) {
        window.location.href = body.url;
        return body;
      }
      applyBalances(body.balances);
      lastMessage.value = body.note || null;
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      purchasing.value = false;
    }
  }

  async function purchaseWelcomePack(method = 'stripe') {
    purchasing.value = true;
    error.value = null;
    lastMessage.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/welcome-pack/purchase`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (body.mode === 'stripe_checkout' && body.url) {
        window.location.href = body.url;
        return body;
      }
      applyBalances(body.balances);
      welcomePack.value = body.pack || { available: false };
      lastMessage.value = body.note || null;
      if (!body.granted?.boosters?.length && !body.granted?.booster) {
        await loadTab(activeTab.value);
      }
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      purchasing.value = false;
    }
  }

  async function unlockBattlePass(method = 'kage_coins') {
    purchasing.value = true;
    error.value = null;
    lastMessage.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/shop/battle-pass/unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (body.mode === 'stripe_checkout' && body.url) {
        window.location.href = body.url;
        return body;
      }
      if (body.offer) battlePassOffer.value = body.offer;
      applyBalances(body.offer?.balances || body.balances);
      applyPayments(body.offer?.payments);
      lastMessage.value = body.note || null;
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      purchasing.value = false;
    }
  }

  async function confirmCheckout(sessionId) {
    if (!sessionId) return null;
    purchasing.value = true;
    error.value = null;
    lastMessage.value = null;
    try {
      const res = await fetch(
        `${API_BASE}/api/shop/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`,
        { credentials: 'include' }
      );
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyBalances(body.balances);
      if (body.fulfilled) {
        lastMessage.value =
          body.product === 'welcome_pack'
            ? 'Welcome pack unlocked.'
            : body.product === 'battle_pass_premium'
              ? 'Battle Pass Premium unlocked.'
              : body.coinsGranted
                ? `+${body.coinsGranted} Kage Coins credited.`
                : 'Payment confirmed.';
      }
      const hasWelcomeOpenings =
        body.product === 'welcome_pack' &&
        (body.granted?.boosters?.length || body.granted?.booster);
      if (!hasWelcomeOpenings) {
        await loadTab(activeTab.value);
      } else if (body.product === 'welcome_pack') {
        welcomePack.value = { available: false };
      }
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      purchasing.value = false;
    }
  }

  function clearResult() {
    lastResult.value = null;
  }

  function clearMessage() {
    lastMessage.value = null;
  }

  function setSelectedElement(el) {
    selectedElement.value = el;
  }

  function setActiveTab(tab) {
    activeTab.value = tab;
  }

  return {
    activeTab,
    boosters,
    dailyItems,
    dailyItemsRenewsAt,
    balances,
    elements,
    coinPacks,
    frames,
    cardEffects,

    battlePassOffer,
    welcomePack,
    coinMeta,
    payments,
    loading,
    opening,
    purchasing,
    error,
    errorCode,
    lastResult,
    lastMessage,
    selectedElement,
    canAfford,
    fetchBalances,
    fetchBoosters,
    fetchDailyItems,
    buyDailyItem,
    fetchCoinPacks,
    fetchFrames,
    purchaseFrame,
    fetchCardEffects,
    fetchCosmetics,
    purchaseCardEffect,

    fetchBattlePassOffer,
    loadTab,
    openBooster,
    purchaseCoinPack,
    purchaseWelcomePack,
    unlockBattlePass,
    confirmCheckout,
    clearResult,
    clearMessage,
    setSelectedElement,
    setActiveTab,
  };
});
