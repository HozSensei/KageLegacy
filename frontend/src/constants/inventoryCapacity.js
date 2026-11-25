/**
 * Capacités d’affichage / UX inventaire (coffre + poche).
 *
 * - Poche : alignée sur RUN_INVENTORY_SLOTS (backend missionRunEconomy) = 4.
 *   Un slot UI = une pile (item_key) ; la run consomme ensuite des unités
 *   dans 4 emplacements mission.
 * - Coffre : capacité de base en « pages » de slots (piles). L’achat de pages
 *   supplémentaires n’est pas branché — extraPages reste à 0 pour l’instant.
 *
 * Le backend n’applique pas encore de plafond sur user_inventory_items ;
 * ces constantes pilotent l’UI (slots vides, désactivation Emporter/Déposer).
 */

/** Emplacements poche (piles) — cohérent avec l’inventaire de mission. */
export const POUCH_CAPACITY = 4;

/** Taille d’une page de coffre (slots / piles). */
export const CHEST_PAGE_SIZE = 12;

/** Nombre de pages de coffre débloquées par défaut. */
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
 * Nombre de slots vides à afficher pour visualiser la capacité.
 * Si le contenu dépasse déjà la capacité (données legacy), n’affiche aucun vide.
 * @param {number} filledCount
 * @param {number} capacity
 * @returns {number}
 */
export function emptySlotCount(filledCount, capacity) {
  const filled = Math.max(0, Math.floor(Number(filledCount) || 0));
  const cap = Math.max(0, Math.floor(Number(capacity) || 0));
  return Math.max(0, cap - filled);
}
