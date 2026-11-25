/**
 * Langage visuel des objets (inventaire, mission, colporteur, boutique).
 * Teintes alignées sur le hub : leaf = soin, sky = utilitaire,
 * vermilion = dégâts, gold = objet à ouvrir.
 */

export const ITEM_CATEGORY_VISUALS = Object.freeze({
  heal: { id: 'heal', tone: 'leaf', icon: 'regen' },
  damage: { id: 'damage', tone: 'vermilion', icon: 'attack' },
  utility: { id: 'utility', tone: 'sky', icon: 'special' },
  sealed: { id: 'sealed', tone: 'gold', icon: 'journal' },
  empty: { id: 'empty', tone: 'neutral', icon: 'inventory' },
});

const EFFECT_CATEGORY = Object.freeze({
  heal_percent: 'heal',
  run_damage_pct: 'damage',
  next_combat_damage_pct: 'damage',
  next_combat_block: 'utility',
  run_start_block: 'utility',
  next_combat_chakra: 'utility',
  next_combat_draw: 'utility',
  run_xp_mult: 'utility',
  run_purse_mult: 'utility',
  run_card_chance: 'utility',
  run_second_wind: 'utility',
});

const ID_CATEGORY = Object.freeze({
  heal_bandage: 'heal',
  heal_tonic: 'heal',
  heal_elixir: 'heal',
  run_boost_damage: 'damage',
  next_damage: 'damage',
  next_block: 'utility',
  next_chakra: 'utility',
  next_draw: 'utility',
  run_xp_scroll: 'utility',
  run_purse_charm: 'utility',
  run_card_omen: 'utility',
  run_second_wind: 'utility',
  run_armor_oil: 'utility',
  card_mystery_common: 'sealed',
  card_mystery_rare: 'sealed',
  card_mystery_legendary: 'sealed',
  booster_standard: 'sealed',
  booster_premium: 'sealed',
  booster_legendary: 'sealed',
});

function itemId(itemOrId) {
  if (itemOrId == null) return null;
  if (typeof itemOrId === 'string') return itemOrId;
  return itemOrId.itemKey || itemOrId.itemId || itemOrId.id || null;
}

/**
 * Catégorie visuelle d’un objet (ou slot vide).
 * @param {object|string|null} itemOrId
 * @returns {'heal'|'damage'|'utility'|'sealed'|'empty'}
 */
export function itemCategory(itemOrId) {
  if (itemOrId == null || itemOrId === '') return 'empty';
  if (typeof itemOrId === 'object' && !itemId(itemOrId) && !itemOrId.kind && !itemOrId.effect) {
    return 'empty';
  }

  if (typeof itemOrId === 'object') {
    if (itemOrId.kind === 'pending_card' || itemOrId.kind === 'booster') return 'sealed';
    const effectType = itemOrId.effect?.type;
    if (effectType && EFFECT_CATEGORY[effectType]) return EFFECT_CATEGORY[effectType];
  }

  const id = itemId(itemOrId);
  if (!id) return 'utility';
  if (ID_CATEGORY[id]) return ID_CATEGORY[id];
  if (id.startsWith('heal_')) return 'heal';
  if (id.startsWith('booster_') || id.startsWith('card_mystery_')) return 'sealed';
  if (id.includes('damage')) return 'damage';
  return 'utility';
}

/**
 * @param {object|string|null} itemOrId
 * @returns {{ id: string, tone: string, icon: string }}
 */
export function itemVisual(itemOrId) {
  const category = itemCategory(itemOrId);
  return ITEM_CATEGORY_VISUALS[category] || ITEM_CATEGORY_VISUALS.utility;
}
