/**
 * Constantes combat legacy (pré-pli).
 * Le moteur actif est `combat/pli/` — ne plus utiliser MAX_TOURS / POINTS_WIN_MARGIN pour la résolution.
 * FORME_* et ELEMENT_BEATS restent partagés.
 */
export const MAX_TOURS = 12; // @deprecated — plis = MAX_PLIS (18)
export const BASE_CHAKRA_COST = 10; // @deprecated — chakra de match retiré du moteur pli
export const TEMERAIRE_CHAKRA_COST = 12;
export const TANK_TARGET_CHANCE = 0.7;
export const SENSEI_SUB_COST = 25; // @deprecated — interception Sensei retirée du moteur pli
export const COMBAT_STATS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

/** @deprecated Lissage duels tour-par-tour (moteur legacy) */
export const DUEL_VARIANCE_SPREAD = 0.18;
export const CRIT_CHANCE_PCT = 8;
export const FUMBLE_CHANCE_PCT = 7;
export const CRIT_DAMAGE_MULT = 1.45;
export const FUMBLE_DAMAGE_MULT = 0.5;
export const CLOSE_CONTEST_CHIP_PCT = 38;
export const UNDERDOG_CHIP_PCT = 15;
export const PARTIAL_DEFLECT_PCT = 18;
/** @deprecated Victoire aux points pre-pli ; le moteur pli compare PV puis plis. */
export const POINTS_WIN_MARGIN = 0.045;

export const FORME_MULTIPLIER = {
  Divin: 1.15,
  Excellent: 1.05,
  Passable: 1.0,
  Lamentable: 0.75,
};

export const FORME_DOWNGRADE = {
  Divin: 'Excellent',
  Excellent: 'Passable',
  Passable: 'Lamentable',
  Lamentable: 'Lamentable',
};

/** Katon > Futon > Doton > Raiton > Suiton > Katon */
export const ELEMENT_BEATS = {
  Katon: 'Futon',
  Futon: 'Doton',
  Doton: 'Raiton',
  Raiton: 'Suiton',
  Suiton: 'Katon',
};
