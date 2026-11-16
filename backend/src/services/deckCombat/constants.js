/** Constantes combat deck-building (docs/COMBAT_SYSTEM.md) */

export const BASE_CHAKRA = 3;
export const DRAW_PER_TURN = 5;
export const MAX_HAND_SIZE = 10;
export const BASE_MAX_HP = 100;

/** Stats de combat TCG : 4 arts (+ extras hors scaling de carte). */
export const STAT_KEYS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
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
/** Hors avantage de triade (et non médecine) : léger malus anti-mono. */
export const TYPE_DISADVANTAGE_MULTIPLIER = 0.85;

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
  /** +X % dégâts sortants (tous types) — buffs soutien */
  damage_pct: 'damage_pct',
  /** +X % armure gagnée */
  block_pct: 'block_pct',
  /** +X % soins */
  heal_pct: 'heal_pct',
  /** +X % dégâts du type indiqué */
  taijutsu_pct: 'taijutsu_pct',
  ninjutsu_pct: 'ninjutsu_pct',
  genjutsu_pct: 'genjutsu_pct',
  regen: 'regen',
  poison: 'poison',
  burn: 'burn',
  weak: 'weak',
  vulnerable: 'vulnerable',
  intangible: 'intangible',
};

/** Débuffs typiquement appliqués par Genjutsu sur l’ennemi. */
export const GENJUTSU_DEBUFF_KEYS = new Set(['weak', 'vulnerable', 'poison', 'burn']);

/**
 * effect_code talents appliqués en combat.
 * Codes absents de cette map → stubbed (listés dans combat.talentEffects).
 * Voir docs/TALENT_EFFECTS.md pour actifs vs reportés.
 */
export const TALENT_EFFECT_MVP = {
  // ── MVP historiques ──
  iron_guard: { kind: 'start_block', value: 3 },
  boosted_regen: { kind: 'start_heal', value: 3, healMult: 1.5 },
  berserker: { kind: 'low_hp_damage', threshold: 0.5, mult: 1.25 },
  immortal: { kind: 'regen_pct', pct: 0.02, damageMult: 0.5 },
  overload: { kind: 'nin_cost_damage', costDelta: 1, damageMult: 2 },
  intangible: { kind: 'no_attack_cap_incoming', incomingCap: 1 },
  combo_master: { kind: 'tai_third_double', cardsNeeded: 3, damageMult: 2 },
  blade_swift: { kind: 'cheap_tai_flat', maxCost: 1, flat: 3 },
  elemental_mastery: { kind: 'element_damage', mult: 1.25 },
  elemental_fusion: { kind: 'dual_element_draw', draw: 1 },
  shadow_feint: { kind: 'first_gen_discount', costDelta: -1 },
  perfect_tank: { kind: 'low_hp_block', threshold: 0.3, block: 5 },

  // ── Taijutsu ──
  counter_strike: { kind: 'after_hp_loss_tai_flat', flat: 4 },
  finisher_blow: { kind: 'low_enemy_hp_tai', threshold: 0.25, mult: 1.5 },
  relentless_press: { kind: 'tai_stack_flat', flatPerCard: 1 },
  absolute_guard: { kind: 'block_mult_tai_cost', blockMult: 2, offensiveTaiCostDelta: 1 },
  adrenaline_rush: { kind: 'low_hp_damage_flat', threshold: 0.5, flat: 3 },
  crushing_grip: { kind: 'heavy_tai_armor_ignore', minCost: 3, armorIgnore: 2 },

  // ── Ninjutsu ──
  chakra_surge: { kind: 'combat_start_chakra', chakra: 1 },
  storm_weave: { kind: 'nin_discount_after', cardsNeeded: 2, costDelta: -1 },
  echo_cast: { kind: 'first_nin_replay', damageMult: 0.5 },
  elemental_cycle: { kind: 'alt_element_flat', flat: 2 },
  void_channel: { kind: 'nin_discount_hp', costDelta: -1, maxHpMult: 0.8 },
  overcharge_spark: { kind: 'zero_chakra_nin_flat', flat: 3 },
  focus_burn: { kind: 'solo_nin_flat', flat: 4 },
  dual_element: { kind: 'deck_elements_nin', minElements: 2, mult: 1.1 },
  mana_well: { kind: 'chakra_every_n_turns', turns: 3, chakra: 1 },

  // ── Genjutsu ──
  illusion_master: { kind: 'gen_debuff_duration', durationDelta: 1 },
  veil_thick: { kind: 'evade_while_debuff', evadeBonus: 0.1 },
  mind_trap: { kind: 'heavy_intent_damage_cut', minDamage: 3, cut: 1 },
  echo_pain: { kind: 'reflect_on_hit', damage: 1 },
  phantom_step: { kind: 'evade_draw', draw: 1 },
  fear_seed: { kind: 'first_gen_debuff_force', force: -2, duration: 2 },
  phantom_sovereign: { kind: 'gen_debuff_intensity_no_block', valueDelta: 1 },
  mirage_armor: { kind: 'combat_start_mirage_block', block: 2 },
  silent_cut: { kind: 'first_card_gen_flat', flat: 2 },
  confusion_tax: { kind: 'gen_debuff_incoming_cut', cut: 2 },

  // ── Médecine ──
  triage_focus: { kind: 'first_heal_flat', flat: 5 },
  purify: { kind: 'start_cleanse', count: 1 },
  blood_bond: { kind: 'heal_grants_block', block: 1, maxPerCombat: 3 },
  field_surgeon: { kind: 'expensive_heal_flat', minCost: 2, flat: 3 },
  living_bastion: {
    kind: 'bastion_start',
    maxHpFlat: 40,
    startBlock: 2,
    healMult: 0.7,
  },
  last_stand_heal: { kind: 'low_hp_heal_double', threshold: 0.2, healMult: 2 },
  vital_overflow: { kind: 'overheal_to_block', ratio: 0.5, maxBlock: 3 },
  steady_hands: { kind: 'heal_flat', flat: 2 },

  // ── Centre / objets (combat) ──
  item_master: { kind: 'items_no_exhaust_deny_tech' },
  item_armor: { kind: 'item_block_flat', flat: 2 },
  item_damage: { kind: 'item_damage_flat', flat: 2 },
  vital_satchel: { kind: 'item_pack_keystone', damageFlat: 1, blockFlat: 1 },
  collector: { kind: 'unique_item_stats', perItem: 1 },
};

export const INTENT_TYPES = ['attack', 'defend', 'buff', 'debuff', 'special'];
