/**
 * Loadouts de référence pour combat:benchmark — alignés sur migration 011 / m4-utility-items-catalog.md
 * Les effets JSON reprennent exactement item_definitions.effects.
 */

let nextItemId = 1000;

function itemRow(slug, matchEffect = null, cycleEffect = null) {
  const id = nextItemId++;
  const effects = {};
  if (matchEffect) effects.match = matchEffect;
  if (cycleEffect) effects.cycle = cycleEffect;
  return { slug, user_item_id: id, effects };
}

/** Consommable match — fumigène sur le Tank */
export const LOADOUT_SMOKE_TANK = {
  id: 'smoke_tank',
  label: 'Fumigène sur Tank (lethal_mitigation −50 %)',
  description: 'Tank équipé fumigène ; consigne Tank cohérente.',
  attach(ninjas) {
    const tank = ninjas.find((n) => n.battle_strategy === 'Tank') || ninjas[1];
    return {
      [tank.id]: [
        itemRow('fumigene-secours', {
          trigger: 'lethal_mitigation',
          damageReduction: 0.5,
          usesPerMatch: 1,
        }),
      ],
    };
  },
};

/** Parchemin rupture sur ninja Genjutsu (Protect/flux) */
export const LOADOUT_RUPTURE_GENJUTSU = {
  id: 'rupture_genjutsu',
  label: 'Parchemin rupture sur support Genjutsu',
  description: 'Défense +4 contre Genjutsu adverse — 1× / match.',
  attach(ninjas) {
    const defender = ninjas.find((n) => n.battle_strategy === 'Protect') || ninjas[2];
    return {
      [defender.id]: [
        itemRow('parchemin-rupture', {
          trigger: 'genjutsu_defense',
          bonus: 4,
          usesPerMatch: 1,
        }),
      ],
    };
  },
};

/** Herbes + cachet sur le support */
export const LOADOUT_SUSTAIN_SUPPORT = {
  id: 'sustain_support',
  label: 'Herbes + cachet chakra sur support',
  description: 'Auto-soin PV < 20 % et Chakra < 15 %.',
  attach(ninjas) {
    const support = ninjas[2];
    return {
      [support.id]: [
        itemRow('herbes-apaisantes', {
          trigger: 'pv_below_pct',
          threshold: 20,
          pvRestore: 15,
          usesPerMatch: 1,
        }),
        itemRow('cachet-chakra', {
          trigger: 'chakra_below_pct',
          threshold: 15,
          chakraRestore: 12,
          usesPerMatch: 1,
        }),
      ],
    };
  },
};

/** Leurre sur l'attaquant Offensive */
export const LOADOUT_DECOY_OFFENSE = {
  id: 'decoy_offense',
  label: 'Parchemin leurre sur Offensive',
  description: '30 % redirection si ciblé — 1× / match.',
  attach(ninjas) {
    const attacker = ninjas.find((n) => n.battle_strategy === 'Offensive') || ninjas[0];
    return {
      [attacker.id]: [
        itemRow('parchemin-leurre', {
          trigger: 'on_targeted',
          redirectChance: 30,
          usesPerMatch: 1,
        }),
      ],
    };
  },
};

/** Poids d'entraînement cycle sur un remplaçant-type (ninjas[1]) */
export const LOADOUT_CYCLE_WEIGHTS = {
  id: 'cycle_weights',
  label: "Poids d'entraînement (cycle)",
  description: '−2 Vitesse en match · +20 % gains entraînement fin de cycle.',
  attach(ninjas) {
    const trainee = ninjas[1];
    return {
      [trainee.id]: [
        itemRow('poids-entrainement', null, {
          trigger: 'training_boost',
          multiplier: 1.2,
          speedPenalty: 2,
        }),
      ],
    };
  },
};

/** Double utilitaire optimisé underdog : fumigène Tank + herbes support */
export const LOADOUT_OPTIMIZED_UNDERDOG = {
  id: 'optimized_underdog',
  label: 'Underdog optimisé (fumigène Tank + herbes support)',
  description: 'Plafond cible milestone-9 : ≤ +12 pts win rate vs sans objet.',
  attach(ninjas) {
    const tank = ninjas.find((n) => n.battle_strategy === 'Tank') || ninjas[1];
    const support = ninjas[2];
    return {
      [tank.id]: [
        itemRow('fumigene-secours', {
          trigger: 'lethal_mitigation',
          damageReduction: 0.5,
          usesPerMatch: 1,
        }),
      ],
      [support.id]: [
        itemRow('herbes-apaisantes', {
          trigger: 'pv_below_pct',
          threshold: 20,
          pvRestore: 15,
          usesPerMatch: 1,
        }),
      ],
    };
  },
};

/** Fumigène mal placé (triple Offensive — objet sans plan) */
export const LOADOUT_MISPLACED_SMOKE = {
  id: 'misplaced_smoke',
  label: 'Fumigène sur Offensive (hors plan)',
  description: 'Cible attendue ≈ 0 à +2 pts — objet sur mauvaise consigne.',
  attach(ninjas) {
    const wrong = ninjas.find((n) => n.battle_strategy === 'Offensive') || ninjas[0];
    return {
      [wrong.id]: [
        itemRow('fumigene-secours', {
          trigger: 'lethal_mitigation',
          damageReduction: 0.5,
          usesPerMatch: 1,
        }),
      ],
    };
  },
};

export const UTILITY_LOADOUTS = [
  LOADOUT_SMOKE_TANK,
  LOADOUT_RUPTURE_GENJUTSU,
  LOADOUT_SUSTAIN_SUPPORT,
  LOADOUT_DECOY_OFFENSE,
  LOADOUT_CYCLE_WEIGHTS,
  LOADOUT_OPTIMIZED_UNDERDOG,
  LOADOUT_MISPLACED_SMOKE,
];

export const UTILITY_LOADOUTS_BY_ID = Object.fromEntries(
  UTILITY_LOADOUTS.map((l) => [l.id, l])
);
