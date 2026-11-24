/**
 * Économie de parcours mission — bourse engagée, inventaire, catalogue shop.
 * Catalogue objets : source de vérité = itemCatalog.js
 */

/** Multiplicateur de récompenses missions coop — source : coopMissionConfig. */
export { COOP_REWARD_MULT } from './coopMissionConfig.js';

export {
  RUN_SHOP_CATALOG,
  RUN_SHOP_OFFER_COUNT,
  getShopItem,
  rollShopOffer,
} from './itemCatalog.js';

export const RUN_ECONOMY_VERSION = 3;

/** Bourses engagées au lancement (prélevées sur le compte / poche). */
export const PURSE_STAKES = Object.freeze([0, 100, 200, 300]);

export const RUN_INVENTORY_SLOTS = 4;

/** Gains de bourse de run (pas le compte). */
export const RUN_PURSE_GAINS = Object.freeze({
  node: 25,
  combat: 50,
});

/** Multiplicateurs XP de fin selon la branche choisie. */
export const BRANCH_XP_MULT = Object.freeze({
  short: 1,
  long: 1.35,
});

export function isValidPurseStake(value) {
  return PURSE_STAKES.includes(Number(value));
}
