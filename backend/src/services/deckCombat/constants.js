/** Constantes combat deck-building (docs/COMBAT_SYSTEM.md) */

export const BASE_CHAKRA = 3;
export const DRAW_PER_TURN = 5;
export const MAX_HAND_SIZE = 10;
export const BASE_MAX_HP = 100;

export const STAT_KEYS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'vitesse',
  'intelligence',
  'dexterity',
  'maxHp',
];

/** Triangle tactique : Tai > Gen > Nin > Tai. Médecine neutre. */
export const TYPE_ADVANTAGE = {
  taijutsu: 'genjutsu',
  genjutsu: 'ninjutsu',
  ninjutsu: 'taijutsu',
};

export const TYPE_ADVANTAGE_MULTIPLIER = 1.2;

/** Cycle élémentaire : katon > futon > raiton > doton > suiton > katon */
export const ELEMENT_BEATS = {
  katon: 'futon',
  futon: 'raiton',
  raiton: 'doton',
  doton: 'suiton',
  suiton: 'katon',
};

export const ELEMENT_ADVANTAGE_MULT = 1.5;
export const ELEMENT_DISADVANTAGE_MULT = 0.7;

export const CRIT_DAMAGE_MULT = 1.5;
export const MAX_CRIT_CHANCE = 50;

export const STATUS_KEYS = {
  force: 'force',
  dexterity: 'dexterity',
  regen: 'regen',
  poison: 'poison',
  burn: 'burn',
  weak: 'weak',
  vulnerable: 'vulnerable',
  intangible: 'intangible',
};

/**
 * effect_code talents appliqués en combat.
 * Codes absents de cette map → stubbed (listés dans combat.talentEffects).
 */
export const TALENT_EFFECT_MVP = {
  iron_guard: { kind: 'start_block', value: 3 },
  boosted_regen: { kind: 'start_heal', value: 3, healMult: 1.5 },
  berserker: { kind: 'low_hp_damage', threshold: 0.5, mult: 1.25 },
  immortal: { kind: 'regen_pct', pct: 0.02, damageMult: 0.5 },
  overload: { kind: 'nin_cost_damage', costDelta: 1, damageMult: 2 },
  intangible: { kind: 'no_attack_cap_incoming', incomingCap: 1 },
  combo_master: { kind: 'tai_combo_force', cardsNeeded: 3, force: 2, duration: 2 },
  blade_swift: { kind: 'cheap_tai_flat', maxCost: 1, flat: 3 },
  elemental_mastery: { kind: 'element_damage', mult: 1.25 },
  elemental_fusion: { kind: 'dual_element_draw', draw: 1 },
  shadow_feint: { kind: 'first_gen_discount', costDelta: -1 },
  perfect_tank: { kind: 'low_hp_block', threshold: 0.3, block: 5 },
  // Stubs restants (discovery / UI) :
  // illusion_master, collector, item_master, perfect_tank siblings, etc.
};

export const INTENT_TYPES = ['attack', 'defend', 'buff', 'debuff', 'special'];
