/**
 * Cercle des compositions : Assaut → Flux → Mur → Assaut
 * Escouade mixte (équilibre) = hors cercle, pas de bonus.
 */

export const COMPOSITION_TYPES = ['assaut', 'flux', 'mur', 'equilibre'];

/**
 * Cercle aligné sur le moteur :
 * Assaut perce le Mur · Mur use le Flux · Flux désorganise l'Assaut
 */
export const COMPOSITION_BEATS = {
  assaut: 'mur',
  mur: 'flux',
  flux: 'assaut',
};

/** Bonus matchup de base */
export const COMPOSITION_ATK_ADVANTAGE = 1.05;
export const COMPOSITION_DEF_ADVANTAGE = 1.03;
export const COMPOSITION_ATK_DISADVANTAGE = 0.95;
export const COMPOSITION_DEF_DISADVANTAGE = 0.97;

/** Ajustement fin par paire (évite qu'une compo écrase tout). */
const PAIR_TUNING = {
  'assaut>mur': { attackMult: 1.02, defendMult: 0.96 },
  'mur>flux': { attackMult: 1.07, defendMult: 0.95 },
  'flux>assaut': { attackMult: 1.24, defendMult: 0.9 },
};

export const COMPOSITION_PROFILE = {
  assaut: { damageDealt: 1.0, damageTaken: 1.0, genjutsuBias: 0 },
  mur: { damageDealt: 0.9, damageTaken: 0.78, tankTargetBonus: 0.15 },
  flux: { damageDealt: 1.0, damageTaken: 0.9, genjutsuBias: 0.78, healBonus: 1.06 },
  equilibre: { damageDealt: 1.0, damageTaken: 1.0, genjutsuBias: 0 },
};

export function getCompositionProfile(comp) {
  return COMPOSITION_PROFILE[comp] || COMPOSITION_PROFILE.equilibre;
}

export function getEffectiveTankTargetChance(baseChance, defenderComp) {
  const profile = getCompositionProfile(defenderComp);
  return Math.min(0.92, baseChance + (profile.tankTargetBonus || 0));
}

const LABELS_FR = {
  assaut: 'Composition Assaut',
  flux: 'Composition Flux',
  mur: 'Composition Mur',
  equilibre: 'Composition équilibrée',
};

export function detectSquadComposition(fighters) {
  const active = fighters.filter((f) => !f.ko && f.pv > 0);
  if (!active.length) return 'equilibre';

  const off = active.filter((f) => f.battle_strategy === 'Offensive').length;
  const tank = active.filter((f) => f.battle_strategy === 'Tank').length;
  const prot = active.filter((f) => f.battle_strategy === 'Protect').length;

  if (off >= 2) return 'assaut';
  if (tank >= 2) return 'mur';
  if (prot >= 2) return 'flux';

  return 'equilibre';
}

export function hasCompositionAdvantage(attackerComp, defenderComp) {
  if (attackerComp === 'equilibre' || defenderComp === 'equilibre') return false;
  return COMPOSITION_BEATS[attackerComp] === defenderComp;
}

export function hasCompositionDisadvantage(attackerComp, defenderComp) {
  if (attackerComp === 'equilibre' || defenderComp === 'equilibre') return false;
  return COMPOSITION_BEATS[defenderComp] === attackerComp;
}

/**
 * Multiplicateurs atk/def pour un duel (côté attaquant).
 * defMult s'applique à la valeur défensive du défenseur quand l'attaquant a l'avantage.
 */
export function getCompositionMatchupMultipliers(attackerComp, defenderComp) {
  let atkMult = 1;
  let defMult = 1;

  if (hasCompositionAdvantage(attackerComp, defenderComp)) {
    atkMult = COMPOSITION_ATK_ADVANTAGE;
    defMult = 1 / COMPOSITION_DEF_ADVANTAGE;
    const pairKey = `${attackerComp}>${defenderComp}`;
    const tune = PAIR_TUNING[pairKey];
    if (tune) {
      atkMult *= tune.attackMult / COMPOSITION_ATK_ADVANTAGE;
      defMult *= tune.defendMult ? 1 / tune.defendMult : 1;
    }
  } else if (hasCompositionDisadvantage(attackerComp, defenderComp)) {
    atkMult = COMPOSITION_ATK_DISADVANTAGE;
    defMult = 1 / COMPOSITION_DEF_DISADVANTAGE;
    const pairKey = `${defenderComp}>${attackerComp}`;
    const tune = PAIR_TUNING[pairKey];
    if (tune) {
      defMult *= tune.defendMult || 1;
      atkMult *= tune.attackMult ? COMPOSITION_ATK_DISADVANTAGE / tune.attackMult : 1;
    }
  }

  return { atkMult, defMult, attackerComp, defenderComp };
}

export function compositionLabel(comp, language = 'fr') {
  if (language === 'en') {
    const en = {
      assaut: 'Assault comp',
      flux: 'Flux comp',
      mur: 'Wall comp',
      equilibre: 'Balanced comp',
    };
    return en[comp] || comp;
  }
  return LABELS_FR[comp] || comp;
}
