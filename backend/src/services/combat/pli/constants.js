/** Combat par plis — constantes v1 */

export const MAX_PLIS = 14;
export const TECHNIQUE_CARDS_PER_NINJA = 3;

export const DOMAINS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

export const TYPE_ADVANTAGE_MULT = 1.2;
export const GEN_MALUS_NEXT = 0.9;
export const TAI_BONUS_NEXT = 1.1;
export const RELAIS_DAMAGE_MULT = 0.5;
export const MED_FAIL_DAMAGE_MULT = 0.5;
export const DECISIVE_EDGE = 12;
export const DECISIVE_DAMAGE_MULT = 1.5;

/** Tai > Gen > Nin > Tai */
export const DOMAIN_BEATS = {
  taijutsu: 'genjutsu',
  genjutsu: 'ninjutsu',
  ninjutsu: 'taijutsu',
};

export const DOMAIN_LABELS = {
  taijutsu: 'Taijutsu',
  ninjutsu: 'Ninjutsu',
  genjutsu: 'Genjutsu',
  medecine: 'Médecine',
};
