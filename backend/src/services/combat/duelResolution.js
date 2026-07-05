import { randomInt } from 'node:crypto';
import {
  CLOSE_CONTEST_CHIP_PCT,
  CRIT_CHANCE_PCT,
  CRIT_DAMAGE_MULT,
  DUEL_VARIANCE_SPREAD,
  FUMBLE_CHANCE_PCT,
  FUMBLE_DAMAGE_MULT,
  PARTIAL_DEFLECT_PCT,
  UNDERDOG_CHIP_PCT,
} from './constants.js';

function roll(max) {
  return randomInt(max);
}

function rollD6() {
  return roll(6) + 1;
}

function damageVariance() {
  const spread = DUEL_VARIANCE_SPREAD;
  return 1 - spread / 2 + roll(Math.ceil(spread * 100)) / 100;
}

/**
 * Résolution physique/ninjutsu avec lissage :
 * - Jet de contestation d6 de chaque côté (la stat compte, le dé accroche)
 * - Écart serré → petite chance d'effleurement pour l'underdog
 * - Variance ±7 % + critique / raté occasionnels
 */
export function resolvePhysicalDuel(atk, def, elementMult, techniqueType) {
  const underdogBonus = atk < def ? 1 : 0;
  const atkContest = atk + rollD6() + underdogBonus;
  const defContest = def + rollD6();
  const edge = atkContest - defContest;

  let raw = 0;
  if (edge > 0) {
    raw = Math.max(2, Math.floor(atk * 1.65 - def * 0.62 + edge * 0.95));
    if (roll(100) < PARTIAL_DEFLECT_PCT) {
      raw = Math.max(1, Math.floor(raw * 0.35));
    }
  } else if (edge >= -3 && roll(100) < CLOSE_CONTEST_CHIP_PCT) {
    raw = Math.max(1, Math.floor(atk * 0.42));
  } else if (roll(100) < UNDERDOG_CHIP_PCT) {
    raw = 1;
  }

  if (raw === 0) {
    return {
      pvDamage: 0,
      chakraDrain: 0,
      duelEdge: edge,
      atkContest,
      defContest,
      variance: 1,
      crit: false,
      fumble: false,
      missed: true,
    };
  }

  const variance = damageVariance();
  let pvDamage = Math.max(1, Math.floor(raw * elementMult * variance));

  const crit = roll(100) < CRIT_CHANCE_PCT;
  const fumble = !crit && roll(100) < FUMBLE_CHANCE_PCT;
  if (crit) pvDamage = Math.floor(pvDamage * CRIT_DAMAGE_MULT);
  if (fumble) pvDamage = Math.max(1, Math.floor(pvDamage * FUMBLE_DAMAGE_MULT));

  const chakraDrain = techniqueType === 'taijutsu' ? Math.floor(atk * 0.3) : 0;

  return {
    pvDamage,
    chakraDrain,
    duelEdge: edge,
    atkContest,
    defContest,
    variance: Math.round(variance * 100) / 100,
    crit,
    fumble,
    missed: false,
  };
}

/**
 * Genjutsu : contestation élargie, l'état compte autant que les dégâts.
 */
export function resolveGenjutsuDuel(atk, def) {
  const atkContest = atk + rollD6() + rollD6();
  const defContest = def + rollD6();
  const success = atkContest > defContest;
  const chip = success ? Math.max(2, Math.floor(atk * 0.28 * damageVariance())) : 0;
  return { success, chip, atkContest, defContest };
}
