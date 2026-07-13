/** Constantes partagées pour les cartes tactiques. */

import { createHash } from 'node:crypto';

export const TACTIC_CARD_MAX_CHARGES = 3;

/** Aligné sur les 5 emplacements éléments du deck d'opération. */
export const STARTER_CARD_SLUGS = [
  'tai-parade-ecole',
  'med-pansement-rapide',
  'nin-eclair-discret',
  'futon-lame-retour',
  'katon-mur-braises',
];

/** Catalogue complet (migration 039) — le magasin en propose un sous-ensemble par joueur. */
export const SHOP_CARD_POOL = [
  'tai-parade-ecole',
  'med-pansement-rapide',
  'nin-eclair-discret',
  'gen-kage-bunshin',
  'suiton-cage-aqueuse',
  'katon-mur-braises',
  'med-soin-zone',
  'raiton-surcharge',
  'gen-illusion-mineure',
  'doton-racines',
  'futon-lame-retour',
  'legende-suiton-dragon',
];

export const SHOP_OFFERS_PER_RESTOCK = 10;

/** Sélection déterministe et distincte par joueur / période de réassort. */
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

export const TRIGGER_KINDS = [
  'targeted_twice_same_tour',
  'ally_below_pv_pct',
  'all_allies_below_pv_pct',
  'self_below_pv_pct',
  'on_attack',
  'on_defend_against_attack',
  'on_genjutsu_success',
];

export const TARGET_KINDS = [
  'self',
  'ally_lowest_pv',
  'all_allies',
  'enemy_defender',
  'enemy_attacker',
  'all_enemies_active',
];
