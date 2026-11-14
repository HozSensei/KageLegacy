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
 * effect_code talents — MVP appliqué vs stub documenté.
 * Les codes non listés sont enregistrés mais inertes en combat.
 */
export const TALENT_EFFECT_MVP = {
  iron_guard: { kind: 'start_block', value: 3 },
  boosted_regen: { kind: 'start_heal', value: 3 },
  berserker: { kind: 'low_hp_damage', threshold: 0.5, mult: 1.25 },
  // Stubs (présents pour discovery / UI, pas encore appliqués) :
  // combo_master, blade_swift, elemental_fusion, overload,
  // illusion_master, shadow_feint, immortal, perfect_tank, elemental_mastery
};

export const INTENT_TYPES = ['attack', 'defend', 'buff', 'debuff', 'special'];
