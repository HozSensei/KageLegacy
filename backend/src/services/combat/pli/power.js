import { randomInt } from 'node:crypto';
import { elementDamageMultiplier } from '../element.js';
import { applyEnvironmentAttackMod } from '../../matchEnvironment.js';
import {
  DOMAIN_BEATS,
  TYPE_ADVANTAGE_MULT,
  DECISIVE_EDGE,
  DECISIVE_DAMAGE_MULT,
  RELAIS_DAMAGE_MULT,
  MED_FAIL_DAMAGE_MULT,
  DAMAGE_POWER_FACTOR,
  DAMAGE_EDGE_FACTOR,
  DAMAGE_MIN,
  TIE_DAMAGE_POWER_FACTOR,
  TIE_DAMAGE_EDGE_FACTOR,
  TIE_DAMAGE_MIN,
} from './constants.js';

function rollD6() {
  return randomInt(6) + 1;
}

export function hasTypeAdvantage(attackerDomain, defenderDomain) {
  if (!attackerDomain || !defenderDomain) return false;
  if (attackerDomain === 'medecine' || defenderDomain === 'medecine') return false;
  return DOMAIN_BEATS[attackerDomain] === defenderDomain;
}

/** Valeur de base d'une stat (domaine combat ou attribut brut). */
export function statBaseValue(fighter, statKey) {
  const s = fighter.stats;
  switch (statKey) {
    case 'taijutsu':
      return s.taijutsu + Math.floor(s.vitesse / 2);
    case 'ninjutsu':
      return s.ninjutsu + Math.floor(s.intelligence / 2);
    case 'genjutsu':
      return s.genjutsu + Math.floor(s.intelligence / 2);
    case 'medecine':
      return s.medecine + Math.floor(s.vitesse / 2);
    case 'vitesse':
      return s.vitesse ?? 0;
    case 'intelligence':
      return s.intelligence ?? 0;
    default:
      return 0;
  }
}

export function domainBaseStat(fighter, domain) {
  return statBaseValue(fighter, domain);
}

/**
 * Puissance d'une carte pour un ninja donné.
 * Si cardDef est fourni (carte technique ninja), applique moyenne de stats + bonus % instance.
 */
export function computeCardPower(fighter, domain, ctx = {}) {
  const { env, nextMod = 1, opponentElement, cardDef } = ctx;
  let power = statBaseValue(fighter, domain);

  if (cardDef) {
    const secondary = cardDef.pli_secondary_stat ?? cardDef.pliSecondaryStat;
    if (secondary) {
      power = Math.floor((power + statBaseValue(fighter, secondary)) / 2);
    }
    const bonusPct = Number(cardDef.pli_bonus_pct ?? cardDef.pliBonusPct ?? 0);
    if (bonusPct > 0) {
      power = Math.floor(power * (1 + bonusPct));
    }
  }

  if (ctx.typeAdvantage) {
    power = Math.floor(power * TYPE_ADVANTAGE_MULT);
  }

  if (domain === 'ninjutsu' && opponentElement && fighter.element_affinity) {
    const mult = elementDamageMultiplier(fighter.element_affinity, opponentElement);
    power = Math.floor(power * mult);
  }

  if (env) {
    const technique = { type: domain };
    power += applyEnvironmentAttackMod(fighter, technique, env);
  }

  power = Math.floor(power * nextMod);
  power += rollD6();
  return power;
}

export function computeDamage(winnerPower, loserPower, { relais = false } = {}) {
  const edge = Math.abs(winnerPower - loserPower);
  let damage = Math.max(
    DAMAGE_MIN,
    Math.floor(winnerPower * DAMAGE_POWER_FACTOR + edge * DAMAGE_EDGE_FACTOR)
  );
  if (edge >= DECISIVE_EDGE) {
    damage = Math.floor(damage * DECISIVE_DAMAGE_MULT);
  }
  if (relais) {
    damage = Math.max(3, Math.floor(damage * RELAIS_DAMAGE_MULT));
  }
  return damage;
}

export function computeTieDamage(powerA, powerB) {
  const avg = (Number(powerA) + Number(powerB)) / 2;
  const edge = Math.abs(powerA - powerB);
  return Math.max(
    TIE_DAMAGE_MIN,
    Math.floor(avg * TIE_DAMAGE_POWER_FACTOR + edge * TIE_DAMAGE_EDGE_FACTOR)
  );
}

export function computeHealAmount(power) {
  return Math.max(4, Math.floor(power * 1.2));
}

export function computeMedFailDamage(fullDamage) {
  return Math.max(1, Math.floor(fullDamage * MED_FAIL_DAMAGE_MULT));
}

export function pickDominantDomain(fighter) {
  const domains = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];
  return domains.reduce((best, d) =>
    statBaseValue(fighter, d) > statBaseValue(fighter, best) ? d : best
  );
}

export function findMostWoundedPct(fighters) {
  const alive = fighters.filter((f) => !f.ko && f.pv > 0);
  if (!alive.length) return null;
  return alive.sort((a, b) => a.pv / a.maxPv - b.pv / b.maxPv)[0];
}

export function teamTotalPv(team) {
  return team.fighters.reduce((s, f) => s + Math.max(0, f.pv), 0);
}

export function allFightersKo(team) {
  return team.fighters.every((f) => f.ko || f.pv <= 0);
}

export function randomProxy(team, rng = Math.random) {
  const alive = team.fighters.filter((f) => !f.ko && f.pv > 0);
  if (!alive.length) return null;
  return alive[Math.floor(rng() * alive.length)];
}
