import { defineStore } from 'pinia';
import { ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useInventoryStore = defineStore('inventory', () => {
  const chest = ref([]);
  const pouch = ref([]);
  const pouchRyos = ref(0);
  const pouchLocked = ref(false);
  const pouchLock = ref(null);
  const chestCapacity = ref(null);
  const pouchCapacity = ref(null);
  const stakes = ref([0, 100, 200, 300]);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref(null);
  const errorCode = ref(null);
  const lastReveal = ref(null);

  function applyPayload(body) {
    if (!body) return;
    chest.value = body.chest || [];
    pouch.value = body.pouch || [];
    pouchRyos.value = Number(body.pouchRyos) || 0;
    pouchLocked.value = Boolean(body.pouchLocked);
    pouchLock.value = body.pouchLock || null;
    if (body.chestCapacity != null) chestCapacity.value = Number(body.chestCapacity) || null;
    if (body.pouchCapacity != null) pouchCapacity.value = Number(body.pouchCapacity) || null;
    if (Array.isArray(body.stakes) && body.stakes.length) {
      stakes.value = body.stakes;
    }
  }

  async function fetchInventory() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/inventory`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyPayload(body);
      return body;
    } catch (e) {
      error.value = e.message;
      errorCode.value = e.code || null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function moveItem(itemKey, { from, to, quantity = 1 } = {}) {
    actionLoading.value = true;
    error.value = null;
    errorCode.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/inventory/move`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, from, to, quantity }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) {
        const err = new Error(await readApiError(res, body));
        err.code = body?.code || null;
        throw err;
      }
      applyPayload(body);
      return body;
    } catch (e) {
      error.value = e.message;
      errorCode.value = e.code || null;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function setPouchRyos(amount) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/inventory/pouch-ryos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) || 0 }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyPayload(body);
      if (body.ryos != null) {
        try {
          const { useShopStore } = await import('./shop.js');
          useShopStore().balances = {
            ...useShopStore().balances,
            ryos: Number(body.ryos) || 0,
          };
        } catch {
          /* optionnel */
        }
      }
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function revealItem(itemKey) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/inventory/reveal`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (body.inventory) applyPayload(body.inventory);
      lastReveal.value = { kind: 'sealed', cards: body.card ? [body.card] : [] };
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function openBooster(itemKey) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/inventory/open`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (body.inventory) applyPayload(body.inventory);
      lastReveal.value = {
        kind: 'booster',
        boosterType: body.boosterType || 'standard',
        cards: body.cards || [],
      };
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  function clearReveal() {
    lastReveal.value = null;
  }

  return {
    chest,
    pouch,
    pouchRyos,
    pouchLocked,
    pouchLock,
    chestCapacity,
    pouchCapacity,
    stakes,
    loading,
    actionLoading,
    error,
    errorCode,
    lastReveal,
    fetchInventory,
    moveItem,
    setPouchRyos,
    revealItem,
    openBooster,
    clearReveal,
  };
});
