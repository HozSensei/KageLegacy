/** Combat par plis — constantes v1 */

export const MAX_PLIS = 18;
/** Cartes technique inventaire (nommées) par ninja actif. */
export const TECHNIQUE_CARDS_PER_NINJA = 1;
/** Copies de la carte stat primaire dans le deck mélangé. */
export const PRIMARY_STAT_COPIES = 2;
/** Copies de la carte stat secondaire dans le deck mélangé. */
export const SECONDARY_STAT_COPIES = 3;
export const STAT_CARDS_PER_NINJA = PRIMARY_STAT_COPIES + SECONDARY_STAT_COPIES;
export const CARDS_PER_NINJA = TECHNIQUE_CARDS_PER_NINJA + STAT_CARDS_PER_NINJA;

export const DOMAINS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

export const TYPE_ADVANTAGE_MULT = 1.2;
export const GEN_MALUS_NEXT = 0.9;
export const TAI_BONUS_NEXT = 1.1;
export const RELAIS_DAMAGE_MULT = 0.5;
export const MED_FAIL_DAMAGE_MULT = 0.5;
/** Écart de puissance à partir duquel le pli est « décisif ». */
export const DECISIVE_EDGE = 8;
export const DECISIVE_DAMAGE_MULT = 1.5;

/**
 * Dégâts d'un pli gagné.
 * Part puissance du vainqueur + bonus d'écart — les exchanges proches font aussi mal.
 * Cible : matchs égaux ≈ 15–20 % KO d'équipe, ~2 ninjas K.O./match.
 */
export const DAMAGE_POWER_FACTOR = 0.75;
export const DAMAGE_EDGE_FACTOR = 1.8;
export const DAMAGE_MIN = 8;

/** Dégâts d'égalité (chip des deux côtés). */
export const TIE_DAMAGE_POWER_FACTOR = 0.28;
export const TIE_DAMAGE_EDGE_FACTOR = 0.7;
export const TIE_DAMAGE_MIN = 4;

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
