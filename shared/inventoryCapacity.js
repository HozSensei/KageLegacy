/**
 * Capacités inventaire (coffre + poche) — source partagée FE/BE.
 *
 * Modèle : **1 objet = 1 slot** (pas de pile qty sur un emplacement).
 * - Poche : alignée sur RUN_INVENTORY_SLOTS (mission) = 4.
 * - Coffre : pages de slots ; rachat de page non branché (pages = 1).
 */

/** Emplacements poche. */
export const POUCH_CAPACITY = 4;

/** Taille d’une page de coffre. */
export const CHEST_PAGE_SIZE = 12;

/** Pages de coffre débloquées par défaut. */
export const CHEST_BASE_PAGES = 1;

/**
 * Capacité totale du coffre.
 * @param {{ pages?: number }} [opts]
 * @returns {number}
 */
export function getChestCapacity({ pages = CHEST_BASE_PAGES } = {}) {
  const n = Math.max(1, Math.floor(Number(pages) || CHEST_BASE_PAGES));
  return n * CHEST_PAGE_SIZE;
}

/** Capacité coffre par défaut (1 page). */
export const CHEST_CAPACITY = getChestCapacity();

/**
 * Nombre de slots vides à afficher.
 * Si le contenu dépasse déjà la capacité (legacy), n’affiche aucun vide.
 * @param {number} filledCount
 * @param {number} capacity
 * @returns {number}
 */
export function emptySlotCount(filledCount, capacity) {
  const filled = Math.max(0, Math.floor(Number(filledCount) || 0));
  const cap = Math.max(0, Math.floor(Number(capacity) || 0));
  return Math.max(0, cap - filled);
}

/**
 * Capacité pour un emplacement.
 * @param {'chest'|'pouch'} location
 * @param {{ chestPages?: number }} [opts]
 * @returns {number}
 */
export function capacityFor(location, { chestPages = CHEST_BASE_PAGES } = {}) {
  if (location === 'pouch') return POUCH_CAPACITY;
  return getChestCapacity({ pages: chestPages });
}

/**
 * Slots coffre requis par une liste de récompenses claimables.
 * - booster / inventory_item → coffre (1 objet = 1 slot)
 * - card → collection (aucune capacité coffre)
 * - monnaies / cosmétiques → aucun slot
 * @param {Array<{ type?: string, amount?: number, quantity?: number, count?: number }>} rewards
 * @returns {number}
 */
export function chestSlotsNeededForRewards(rewards = []) {
  const list = Array.isArray(rewards) ? rewards : rewards ? [rewards] : [];
  let need = 0;
  for (const reward of list) {
    if (!reward || typeof reward !== 'object') continue;
    const type = reward.type;
    if (type === 'booster' || type === 'inventory_item') {
      need += Math.max(
        1,
        Number(reward.amount) || Number(reward.quantity) || Number(reward.count) || 1,
      );
    }
  }
  return need;
}
