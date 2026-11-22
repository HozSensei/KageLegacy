import { computed, readonly, ref } from 'vue';

/**
 * Taille d’affichage des cartes en grille (desktop).
 * Persistance localStorage ; le mobile ignore le contrôle UI et garde la grille 2 colonnes.
 */
export const CARD_SIZE_STORAGE_KEY = 'kage-legacy-card-size';
export const CARD_SIZES = ['normal', 'large'];
export const DEFAULT_CARD_SIZE = 'normal';

function readStoredSize() {
  try {
    const stored = window.localStorage.getItem(CARD_SIZE_STORAGE_KEY);
    return CARD_SIZES.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredSize(value) {
  try {
    window.localStorage.setItem(CARD_SIZE_STORAGE_KEY, value);
  } catch {
    // Stockage indisponible : le choix vaut pour la session.
  }
}

const size = ref(
  typeof window !== 'undefined' ? readStoredSize() || DEFAULT_CARD_SIZE : DEFAULT_CARD_SIZE
);

let storageBound = false;

function ensureStorageSync() {
  if (storageBound || typeof window === 'undefined') return;
  if (typeof window.addEventListener !== 'function') return;
  storageBound = true;
  window.addEventListener('storage', event => {
    if (event.key !== CARD_SIZE_STORAGE_KEY) return;
    size.value = readStoredSize() || DEFAULT_CARD_SIZE;
  });
}

export function useCardSizePreference() {
  ensureStorageSync();

  function setCardSize(value) {
    if (!CARD_SIZES.includes(value)) return;
    size.value = value;
    writeStoredSize(value);
  }

  return {
    cardSize: readonly(size),
    cardSizes: CARD_SIZES,
    isLargeCards: computed(() => size.value === 'large'),
    setCardSize,
  };
}
