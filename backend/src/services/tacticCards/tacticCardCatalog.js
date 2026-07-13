/** Constantes partagées pour les cartes technique ninja. */

import { createHash } from 'node:crypto';

export const TACTIC_CARD_MAX_CHARGES = 5;
export const TECHNIQUE_SLOTS_PER_NINJA = 1;

/** Cartes génériques sans prérequis d'élément — une par slot de départ typique. */
export const STARTER_CARD_SLUGS = [
  'tai-lame-chakras',
  'nin-afflux-chakra',
  'gen-mirage-simple',
  'med-scalpel-chakra',
  'tai-coup-poing-leon',
];

/** Catalogue complet (migration 052). */
export const SHOP_CARD_POOL = [
  'tai-lame-chakras',
  'tai-lame-suiton',
  'tai-coup-poing-leon',
  'tai-rotation-poings',
  'tai-lame-futon',
  'nin-afflux-chakra',
  'nin-katon-boule',
  'nin-suiton-dragon',
  'nin-raiton-eclair',
  'nin-doton-seisme',
  'nin-futon-lame',
  'nin-clone-ombre',
  'gen-mirage-simple',
  'gen-brume-mentale',
  'gen-dango-cuisiniere',
  'med-scalpel-chakra',
  'med-paume-mystique',
  'med-antidote-choc',
  'tai-frappe-ombre',
  'nin-chidori',
  'tai-poing-chakra',
  'tai-enchainement',
  'tai-mur-parade',
  'tai-coup-furtif',
  'tai-pied-ecrasant',
  'nin-mur-katon',
  'nin-spirale-suiton',
  'nin-eclair-double',
  'nin-prison-doton',
  'nin-rafale-futon',
  'gen-illusion-miroir',
  'gen-chaos-esprit',
  'gen-voile-paralysie',
  'gen-brume-apaisante',
  'med-bonus-soin',
  'med-barriere-vie',
  'med-paume-choc',
  'nin-kirin',
  'nin-amaterasu',
  'tai-dragon-impact',
];

export const SHOP_OFFERS_PER_RESTOCK = 10;

/** Coût de perfectionnement = catalog_price × multiplicateur par rareté. */
export const REFINEMENT_COST_MULTIPLIER_BY_RARITY = {
  common: 0.5,
  rare: 0.75,
  legendary: 1,
};

export function computeRefinementCost(catalogPrice, rarity) {
  const mult = REFINEMENT_COST_MULTIPLIER_BY_RARITY[rarity] ?? 0.5;
  return Math.max(1, Math.floor(Number(catalogPrice) * mult));
}

function createSeededRng(userId, restockPeriod) {
  const hash = createHash('sha256').update(`${userId}:${restockPeriod}`).digest();
  let cursor = 0;
  return () => {
    const a = hash.readUInt32BE(cursor % (hash.length - 3));
    cursor = (cursor + 4) % (hash.length - 3);
    const b = hash.readUInt32BE(cursor % (hash.length - 3));
    cursor = (cursor + 4) % (hash.length - 3);
    return ((a ^ b) >>> 0) / 4294967296;
  };
}

/**
 * Tire `count` cartes distinctes au hasard dans le pool.
 * Chaque période de réassort est un tirage indépendant — les offres peuvent revenir.
 */
export function pickShopSlugsFromPool(pool, userId, restockPeriod, count = SHOP_OFFERS_PER_RESTOCK) {
  const rand = createSeededRng(userId, restockPeriod);
  const available = [...pool];
  const picked = [];
  const target = Math.min(count, available.length);
  while (picked.length < target) {
    const idx = Math.floor(rand() * available.length);
    picked.push(available.splice(idx, 1)[0]);
  }
  return picked;
}

export function pickShopSlugs(userId, restockPeriod) {
  return pickShopSlugsFromPool(SHOP_CARD_POOL, userId, restockPeriod);
}

export function canAssignTechniqueToNinja(card, ninja) {
  if (!card?.elementAffinity && !card?.element_affinity) return true;
  const required = card.elementAffinity || card.element_affinity;
  return ninja?.element_affinity === required;
}
