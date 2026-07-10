/** Constantes partagées pour les cartes tactiques. */

export const TACTIC_CARD_MAX_CHARGES = 3;
export const STARTER_CARD_SLUGS = ['tai-parade-ecole', 'med-pansement-rapide', 'nin-eclair-discret'];

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
