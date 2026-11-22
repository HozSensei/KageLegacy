/**
 * Économie de parcours mission — bourse engagée, inventaire, catalogue shop.
 */

export const RUN_ECONOMY_VERSION = 2;

/** Bourses engagées au lancement (prélevées sur le compte). */
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

/**
 * Catalogue shop run — achat ≠ usage.
 * kind:
 *  - consumable → inventaire, usable hors combat
 *  - pending_card → inventaire scellé, grant à la fin
 */
export const RUN_SHOP_CATALOG = Object.freeze([
  Object.freeze({
    id: 'heal_bandage',
    kind: 'consumable',
    price: 40,
    nameFr: 'Bandage',
    nameEn: 'Bandage',
    descriptionFr: 'Soigne 25 % des PV max (hors combat).',
    descriptionEn: 'Heals 25% of max HP (out of combat).',
    effect: Object.freeze({ type: 'heal_percent', value: 0.25 }),
  }),
  Object.freeze({
    id: 'heal_tonic',
    kind: 'consumable',
    price: 75,
    nameFr: 'Tonique',
    nameEn: 'Tonic',
    descriptionFr: 'Soigne 50 % des PV max (hors combat).',
    descriptionEn: 'Heals 50% of max HP (out of combat).',
    effect: Object.freeze({ type: 'heal_percent', value: 0.5 }),
  }),
  Object.freeze({
    id: 'heal_elixir',
    kind: 'consumable',
    price: 110,
    nameFr: 'Élixir vital',
    nameEn: 'Vital Elixir',
    descriptionFr: 'Soigne 75 % des PV max (hors combat).',
    descriptionEn: 'Heals 75% of max HP (out of combat).',
    effect: Object.freeze({ type: 'heal_percent', value: 0.75 }),
  }),
  Object.freeze({
    id: 'card_mystery_common',
    kind: 'pending_card',
    price: 55,
    rarity: 'common',
    nameFr: 'Parchemin scellé (commun)',
    nameEn: 'Sealed scroll (common)',
    descriptionFr: 'Carte commune révélée à la fin du parcours.',
    descriptionEn: 'Common card revealed at the end of the run.',
  }),
  Object.freeze({
    id: 'card_mystery_rare',
    kind: 'pending_card',
    price: 130,
    rarity: 'rare',
    nameFr: 'Parchemin scellé (rare)',
    nameEn: 'Sealed scroll (rare)',
    descriptionFr: 'Carte rare révélée à la fin du parcours.',
    descriptionEn: 'Rare card revealed at the end of the run.',
  }),
  Object.freeze({
    id: 'card_mystery_legendary',
    kind: 'pending_card',
    price: 210,
    rarity: 'legendary',
    nameFr: 'Parchemin scellé (légendaire)',
    nameEn: 'Sealed scroll (legendary)',
    descriptionFr: 'Carte légendaire révélée à la fin du parcours.',
    descriptionEn: 'Legendary card revealed at the end of the run.',
  }),
  Object.freeze({
    id: 'run_boost_damage',
    kind: 'consumable',
    price: 70,
    nameFr: 'Sceau de frappe',
    nameEn: 'Strike Seal',
    descriptionFr: '+10 % dégâts pour le reste du parcours.',
    descriptionEn: '+10% damage for the rest of the run.',
    effect: Object.freeze({ type: 'run_damage_pct', value: 10 }),
  }),
  Object.freeze({
    id: 'next_block',
    kind: 'consumable',
    price: 50,
    nameFr: 'Talisman d’armure',
    nameEn: 'Armor Talisman',
    descriptionFr: '+8 armure au prochain combat.',
    descriptionEn: '+8 armor at the start of the next fight.',
    effect: Object.freeze({ type: 'next_combat_block', value: 8 }),
  }),
  Object.freeze({
    id: 'next_chakra',
    kind: 'consumable',
    price: 55,
    nameFr: 'Pilule de chakra',
    nameEn: 'Chakra Pill',
    descriptionFr: '+1 Chakra au début du prochain combat.',
    descriptionEn: '+1 Chakra at the start of the next fight.',
    effect: Object.freeze({ type: 'next_combat_chakra', value: 1 }),
  }),
  Object.freeze({
    id: 'next_damage',
    kind: 'consumable',
    price: 65,
    nameFr: 'Encens de rage',
    nameEn: 'Rage Incense',
    descriptionFr: '+15 % dégâts pendant le prochain combat.',
    descriptionEn: '+15% damage during the next fight.',
    effect: Object.freeze({ type: 'next_combat_damage_pct', value: 15 }),
  }),
]);

/** Nombre d’offres tirées par nœud shop. */
export const RUN_SHOP_OFFER_COUNT = 4;

export function getShopItem(itemId) {
  return RUN_SHOP_CATALOG.find(item => item.id === itemId) || null;
}

export function isValidPurseStake(value) {
  return PURSE_STAKES.includes(Number(value));
}

/**
 * Tire une offre shop (stock 1, sans doublon).
 * Garantit au moins un soin bas de gamme quand possible.
 */
export function rollShopOffer(rng = Math.random) {
  const pool = [...RUN_SHOP_CATALOG];
  const offer = [];
  const bandage = pool.find(item => item.id === 'heal_bandage');
  if (bandage) {
    offer.push({ ...bandage, stock: 1 });
    pool.splice(
      pool.findIndex(item => item.id === bandage.id),
      1,
    );
  }
  while (offer.length < RUN_SHOP_OFFER_COUNT && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    const [item] = pool.splice(idx, 1);
    offer.push({ ...item, stock: 1 });
  }
  return offer;
}
