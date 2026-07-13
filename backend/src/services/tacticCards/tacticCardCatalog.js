/** Constantes partagées pour les cartes technique ninja. */

import { createHash } from 'node:crypto';

export const TACTIC_CARD_MAX_CHARGES = 3;
export const TECHNIQUE_SLOTS_PER_NINJA = 3;

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
];

export const SHOP_OFFERS_PER_RESTOCK = 10;

export function pickShopSlugs(userId, restockPeriod) {
  const hash = createHash('sha256').update(`${userId}:${restockPeriod}`).digest();
  const indices = SHOP_CARD_POOL.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = hash[i % hash.length] % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const count = Math.min(SHOP_OFFERS_PER_RESTOCK, SHOP_CARD_POOL.length);
  return indices.slice(0, count).map((i) => SHOP_CARD_POOL[i]);
}

export function canAssignTechniqueToNinja(card, ninja) {
  if (!card?.elementAffinity && !card?.element_affinity) return true;
  const required = card.elementAffinity || card.element_affinity;
  return ninja?.element_affinity === required;
}
