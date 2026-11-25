import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { readApiError, parseApiResponse } from '../utils/http.js';
import { OWNERSHIP_FILTER_SET } from '../utils/cardOwnershipFilter.js';

const API_BASE = import.meta.env.VITE_API_URL || '';
export const COLLECTION_OWNED_ONLY_KEY = 'kage-legacy-collection-owned-only';
export const COLLECTION_OWNERSHIP_FILTER_KEY = 'kage-legacy-collection-ownership-filter';

function readOwnershipFilterPreference() {
  try {
    const stored = window.localStorage.getItem(COLLECTION_OWNERSHIP_FILTER_KEY);
    if (stored !== null) {
      return OWNERSHIP_FILTER_SET.has(stored) ? stored : '';
    }
    // Migration depuis l’ancien booléen « possédées uniquement ».
    if (window.localStorage.getItem(COLLECTION_OWNED_ONLY_KEY) === '1') return 'owned';
    return '';
  } catch {
    return '';
  }
}

function writeOwnershipFilterPreference(value) {
  try {
    window.localStorage.setItem(COLLECTION_OWNERSHIP_FILTER_KEY, value || '');
    window.localStorage.setItem(COLLECTION_OWNED_ONLY_KEY, value === 'owned' ? '1' : '0');
  } catch {
    // Stockage indisponible : le choix vaut pour la session.
  }
}

export const useCollectionStore = defineStore('collection', () => {
  const entries = ref([]);
  /** Catalogue complet (définitions), ordre API / seed. */
  const catalogue = ref([]);
  const loading = ref(false);
  const catalogueLoading = ref(false);
  const error = ref(null);
  const actionLoading = ref(false);
  const ownershipFilter = ref(
    typeof window !== 'undefined' ? readOwnershipFilterPreference() : ''
  );

  watch(ownershipFilter, value => {
    writeOwnershipFilterPreference(value);
  });

  /** @deprecated Prefer ownershipFilter — conservé pour compat lectures legacy. */
  const ownedOnly = computed(() => ownershipFilter.value === 'owned');

  const byType = computed(() => {
    const map = {};
    for (const entry of entries.value) {
      const type = entry.card?.type || 'other';
      if (!map[type]) map[type] = [];
      map[type].push(entry);
    }
    return map;
  });

  const totalCards = computed(() => entries.value.reduce((sum, e) => sum + (e.quantity || 0), 0));

  const ownedUniqueCount = computed(() => entries.value.length);
  const catalogueTotal = computed(() => catalogue.value.length);

  /**
   * Grille catalogue : entrée possédée ou « trou » pour chaque définition.
   * `catalogueNumber` = index 1-based dans le catalogue API (ordre seed / grille complète).
   */
  const catalogueSlots = computed(() => {
    const byDefId = new Map(entries.value.map(entry => [Number(entry.cardDefinitionId), entry]));
    return catalogue.value.map((card, index) => {
      const catalogueNumber = index + 1;
      const entry = byDefId.get(Number(card.id));
      if (entry) {
        return {
          kind: 'owned',
          key: `owned-${entry.collectionId}`,
          card: entry.card,
          entry,
          catalogueNumber,
        };
      }
      return {
        kind: 'hole',
        key: `hole-${card.id}`,
        card,
        entry: null,
        catalogueNumber,
      };
    });
  });

  async function fetchCollection(params = {}, { reportError = true } = {}) {
    loading.value = true;
    if (reportError) error.value = null;
    try {
      const query = new URLSearchParams();
      if (params.type) query.set('type', params.type);
      if (params.rarity) query.set('rarity', params.rarity);
      const qs = query.toString();
      const res = await fetch(`${API_BASE}/api/collection${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      entries.value = body.collection || [];
      return entries.value;
    } catch (e) {
      if (!reportError) return null;
      error.value = e.message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchCatalogue(params = {}) {
    catalogueLoading.value = true;
    try {
      const query = new URLSearchParams();
      if (params.type) query.set('type', params.type);
      if (params.rarity) query.set('rarity', params.rarity);
      const qs = query.toString();
      const res = await fetch(`${API_BASE}/api/cards${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      catalogue.value = body.cards || [];
      return catalogue.value;
    } catch (e) {
      // Ne pas écraser une erreur collection déjà affichée ; garder le dernier catalogue.
      if (!error.value) error.value = e.message;
      return catalogue.value;
    } finally {
      catalogueLoading.value = false;
    }
  }

  /** Charge collection + catalogue en parallèle (vue Collection). */
  async function fetchCollectionView() {
    error.value = null;
    await Promise.all([fetchCollection(), fetchCatalogue()]);
  }

  async function runAction(collectionId, action, payload) {
    actionLoading.value = true;
    try {
      const res = await fetch(`${API_BASE}/api/collection/${collectionId}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      // Un échec du rafraîchissement post-action reste local, sans effacer une erreur de chargement.
      const refreshed = await fetchCollection({}, { reportError: false });
      return { ...body, refreshFailed: refreshed === null };
    } finally {
      actionLoading.value = false;
    }
  }

  function upgrade(collectionId) {
    return runAction(collectionId, 'upgrade');
  }

  function disenchant(collectionId, quantity = 1) {
    return runAction(collectionId, 'disenchant', { quantity });
  }

  function findByCollectionId(id) {
    return entries.value.find(e => e.collectionId === Number(id)) || null;
  }

  function setOwnershipFilter(value) {
    ownershipFilter.value = OWNERSHIP_FILTER_SET.has(value) ? value : '';
  }

  /** @deprecated Prefer setOwnershipFilter */
  function setOwnedOnly(value) {
    setOwnershipFilter(value ? 'owned' : '');
  }

  return {
    entries,
    catalogue,
    loading,
    catalogueLoading,
    error,
    actionLoading,
    ownershipFilter,
    ownedOnly,
    byType,
    totalCards,
    ownedUniqueCount,
    catalogueTotal,
    catalogueSlots,
    fetchCollection,
    fetchCatalogue,
    fetchCollectionView,
    upgrade,
    disenchant,
    findByCollectionId,
    setOwnershipFilter,
    setOwnedOnly,
  };
});
