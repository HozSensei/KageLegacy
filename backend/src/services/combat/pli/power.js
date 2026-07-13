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
} from './constants.js';

function rollD6() {
  return randomInt(6) + 1;
}

export function hasTypeAdvantage(attackerDomain, defenderDomain) {
  if (!attackerDomain || !defenderDomain) return false;
  if (attackerDomain === 'medecine' || defenderDomain === 'medecine') return false;
  return DOMAIN_BEATS[attackerDomain] === defenderDomain;
}

export function domainBaseStat(fighter, domain) {
  const s = fighter.stats;
  switch (domain) {
    case 'taijutsu':
      return s.taijutsu + Math.floor(s.vitesse / 2);
    case 'ninjutsu':
      return s.ninjutsu + Math.floor(s.intelligence / 2);
    case 'genjutsu':
      return s.genjutsu + Math.floor(s.intelligence / 2);
    case 'medecine':
      return s.medecine + Math.floor(s.vitesse / 2);
    default:
      return 0;
  }
}

/**
 * Puissance d'une carte pour un ninja donné.
 */
export function computeCardPower(fighter, domain, ctx = {}) {
  const { env, nextMod = 1, opponentElement } = ctx;
  let power = domainBaseStat(fighter, domain);

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
  let damage = Math.max(2, Math.floor(edge * 1.0));
  if (edge >= DECISIVE_EDGE) {
    damage = Math.floor(damage * DECISIVE_DAMAGE_MULT);
  }
  if (relais) {
    damage = Math.max(1, Math.floor(damage * RELAIS_DAMAGE_MULT));
  }
  return damage;
}

export function computeTieDamage(powerA, powerB) {
  const edge = Math.abs(powerA - powerB);
  return Math.max(1, Math.floor(edge * 0.4));
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
    domainBaseStat(fighter, d) > domainBaseStat(fighter, best) ? d : best
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
