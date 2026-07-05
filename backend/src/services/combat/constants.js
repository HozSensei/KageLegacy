export const MAX_TOURS = 12;
export const BASE_CHAKRA_COST = 10;
export const TEMERAIRE_CHAKRA_COST = 12;
export const TANK_TARGET_CHANCE = 0.7;
export const SENSEI_SUB_COST = 25;
export const COMBAT_STATS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

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
